package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"backend/internal/model"
)

// ErrInvalidMusicID used by handler to respond 400 Bad Request.
var ErrInvalidMusicID = errors.New("musicId tidak valid")

// ErrStreamUnavailable used by handler to respond 404 Not Found
// (video not found, private, age-restricted, etc).
var ErrStreamUnavailable = errors.New("lagu tidak dapat diputar")

var (
	musicIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)
	// duration can be "3:45" or "1:02:33"; locale id uses dot ("3.45").
	durationRe = regexp.MustCompile(`^\d+([:.]\d{2})+$`)
)

const (
	// Internal endpoint YouTube Music (innertube) for search.
	ytmSearchURL = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false"
	// Filter the search results to include only the songs shelf..

	ytmSongsFilter = "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"

	// The yt-dlp output stream URL is valid for about 6 hours, cache it for 4 hours..
	streamCacheTTL = 4 * time.Hour
	// Time limit for calling yt-dlp.
	resolveTimeout = 30 * time.Second
)

type MusicService interface {
	// Search for songs on YouTube Music based on input query.
	Search(ctx context.Context, query string, limit int) ([]model.MusicResult, error)
	// OpenStream opens an audio connection for a video ID and returns an upstream response
	OpenStream(ctx context.Context, videoID, rangeHeader string) (*http.Response, error)
	// OpenThumbnail retrieves thumbnail images.
	OpenThumbnail(ctx context.Context, rawURL string) (*http.Response, error)
}

type musicService struct {
	// searchClient for fast JSON API calls (with a timeout).
	searchClient *http.Client
	// streamClient for audio proxy without a timeout song duration can exceed 15 seconds, canceled when the client disconnects.
	streamClient *http.Client

	// Cache the stream URL for each video ID so that yt-dlp isn't called for every range request.
	mu      sync.Mutex
	streams map[string]streamEntry
}

type streamEntry struct {
	url    string
	expiry time.Time
}

func NewMusicService() MusicService {
	return &musicService{
		searchClient: &http.Client{Timeout: 15 * time.Second},
		streamClient: &http.Client{},
		streams:      make(map[string]streamEntry),
	}
}

type ytSearchResponse struct {
	Contents *ytSearchContents `json:"contents"`
}

type ytSearchContents struct {
	TabbedSearchResultsRenderer *struct {
		Tabs []ytSearchTab `json:"tabs"`
	} `json:"tabbedSearchResultsRenderer"`
}

type ytSearchTab struct {
	TabRenderer *struct {
		Content *struct {
			SectionListRenderer *struct {
				Contents []ytSearchSection `json:"contents"`
			} `json:"sectionListRenderer"`
		} `json:"content"`
	} `json:"tabRenderer"`
}

type ytSearchSection struct {
	MusicShelfRenderer *ytMusicShelf `json:"musicShelfRenderer"`
	ItemSection        *struct {
		Contents []struct {
			MusicResponsiveListItemRenderer *ytMusicListItem `json:"musicResponsiveListItemRenderer"`
		} `json:"contents"`
	} `json:"itemSectionRenderer"`
}

type ytMusicShelf struct {
	Contents []struct {
		MusicResponsiveListItemRenderer *ytMusicListItem `json:"musicResponsiveListItemRenderer"`
	} `json:"contents"`
}

type ytMusicListItem struct {
	FlexColumns []struct {
		MusicResponsiveListItemFlexColumnRenderer *struct {
			Text *struct {
				Runs []struct {
					Text string `json:"text"`
				} `json:"runs"`
			} `json:"text"`
		} `json:"musicResponsiveListItemFlexColumnRenderer"`
	} `json:"flexColumns"`
	FixedColumns []struct {
		MusicResponsiveListItemFixedColumnRenderer *struct {
			Text *struct {
				Runs []struct {
					Text string `json:"text"`
				} `json:"runs"`
			} `json:"text"`
		} `json:"musicResponsiveListItemFixedColumnRenderer"`
	} `json:"fixedColumns"`
	Thumbnail *struct {
		MusicThumbnailRenderer *struct {
			Thumbnail *struct {
				Thumbnails []struct {
					URL string `json:"url"`
				} `json:"thumbnails"`
			} `json:"thumbnail"`
		} `json:"musicThumbnailRenderer"`
	} `json:"thumbnail"`
	PlaylistItemData *struct {
		VideoID string `json:"videoId"`
	} `json:"playlistItemData"`
}

func (s *musicService) Search(ctx context.Context, query string, limit int) ([]model.MusicResult, error) {
	if limit <= 0 {
		limit = 20
	}

	// Two searches run in parallel:
	//  - "Songs" filter : dense song results, complete metadata
	//  - no filter      : also loads VIDEOs (covers, remixes, MVs) that don't appear in the songs shelf, these often went missing
	var (
		wg              sync.WaitGroup
		filteredItems   []*ytMusicListItem
		unfilteredItems []*ytMusicListItem
		filteredErr     error
		unfilteredErr   error
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		parsed, err := s.fetchSearch(ctx, query, ytmSongsFilter)
		if err != nil {
			filteredErr = err
			return
		}
		filteredItems = s.collectItems(parsed)
	}()
	go func() {
		defer wg.Done()
		parsed, err := s.fetchSearch(ctx, query, "")
		if err != nil {
			unfilteredErr = err
			return
		}
		unfilteredItems = s.collectItems(parsed)
	}()
	wg.Wait()

	// Both fail == error. If either succeeds, its results are still used.
	if filteredErr != nil && unfilteredErr != nil {
		return nil, filteredErr
	}

	// Merge: songs shelf results first (most relevant), reserving a few slots for other results (videos/covers/remixes from the unfiltered search) 
	// so they still show up instead of drowning in the song list.
	songCap := limit - min(5, limit/4)
	seen := make(map[string]bool)
	results := make([]model.MusicResult, 0, limit)
	addAll := func(items []*ytMusicListItem, cap int) {
		for _, listItem := range items {
			if len(results) >= cap {
				return
			}
			if listItem == nil || listItem.PlaylistItemData == nil || listItem.PlaylistItemData.VideoID == "" {
				continue
			}
			if seen[listItem.PlaylistItemData.VideoID] {
				continue
			}
			if result, ok := parseListItem(listItem); ok {
				seen[result.VideoID] = true
				results = append(results, result)
			}
		}
	}
	addAll(filteredItems, songCap)
	addAll(unfilteredItems, limit)
	return results, nil
}

// fetchSearch calls the innertube search API (empty params = no filter).
func (s *musicService) fetchSearch(ctx context.Context, query, params string) (*ytSearchResponse, error) {
	body := map[string]any{
		"context": map[string]any{
			"client": map[string]any{
				"clientName":    "WEB_REMIX",
				"clientVersion": "1.20240401.01.00",
				"hl":            "id",
				"gl":            "ID",
			},
		},
		"query": query,
	}
	if params != "" {
		body["params"] = params
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, ytmSearchURL, strings.NewReader(string(payload)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
	req.Header.Set("Origin", "https://music.youtube.com")
	req.Header.Set("Referer", "https://music.youtube.com/")

	res, err := s.searchClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("youtube music search gagal: status %d", res.StatusCode)
	}

	var parsed ytSearchResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

// collectItems gathers all items with a potential videoId from the two
// possible response shapes: shelf (songs) and itemSection (flat results).
func (s *musicService) collectItems(parsed *ytSearchResponse) []*ytMusicListItem {
	var items []*ytMusicListItem
	if parsed == nil || parsed.Contents == nil || parsed.Contents.TabbedSearchResultsRenderer == nil {
		return items
	}
	for _, tab := range parsed.Contents.TabbedSearchResultsRenderer.Tabs {
		if tab.TabRenderer == nil || tab.TabRenderer.Content == nil || tab.TabRenderer.Content.SectionListRenderer == nil {
			continue
		}
		for _, section := range tab.TabRenderer.Content.SectionListRenderer.Contents {
			switch {
			case section.MusicShelfRenderer != nil:
				for _, item := range section.MusicShelfRenderer.Contents {
					items = append(items, item.MusicResponsiveListItemRenderer)
				}
			case section.ItemSection != nil:
				for _, item := range section.ItemSection.Contents {
					items = append(items, item.MusicResponsiveListItemRenderer)
				}
			}
		}
	}
	return items
}

// An item can be a "Song" (columns: title, artist - album - duration) or a "Video" (columns: title, Video - channel - view count - duration).
func parseListItem(item *ytMusicListItem) (model.MusicResult, bool) {
	title := columnRuns(item, 0)
	if title == "" {
		return model.MusicResult{}, false
	}

	result := model.MusicResult{
		VideoID: item.PlaylistItemData.VideoID,
		Title:   title,
	}

	// Duration: try fixedColumns first (right-hand column on song items),
	// then look in any flex column matching the time pattern (video items).
	result.Duration = fixedColumnDuration(item)
	if result.Duration == "" {
		result.Duration = anyColumnDuration(item)
	}

	// Artist/album come from the metadata parts of column 1; drop parts that
	// are type labels ("Video", "Lagu"), view counts, or years.
	var metaParts []string
	for _, part := range splitColumn(item, 1) {
		if isNoisePart(part) {
			continue
		}
		metaParts = append(metaParts, part)
	}
	if len(metaParts) > 0 {
		result.Artist = metaParts[0]
	}
	if len(metaParts) > 1 {
		result.Album = metaParts[1]
	}

	result.Thumbnail = thumbnailURL(item)
	return result, true
}

// isNoisePart filters out metadata parts that are not artist/album.
func isNoisePart(part string) bool {
	switch part {
	case "Video", "Lagu", "Song", "Video video", "Single", "EP", "Album":
		return true
	}
	// view counts: "2 jt x ditonton", "2M views"
	if strings.Contains(part, "ditonton") || strings.HasSuffix(part, "views") {
		return true
	}
	// release year
	if len(part) == 4 && strings.TrimLeft(part, "0123456789") == "" {
		return true
	}
	return false
}

// anyColumnDuration looks for time-patterned text in all flex columns.
func anyColumnDuration(item *ytMusicListItem) string {
	for i := range item.FlexColumns {
		for _, part := range splitColumn(item, i) {
			if durationRe.MatchString(part) {
				return strings.ReplaceAll(part, ".", ":")
			}
		}
	}
	return ""
}

// thumbnailURL returns the last valid thumbnail URL (the largest one).
func thumbnailURL(item *ytMusicListItem) string {
	if item.Thumbnail == nil || item.Thumbnail.MusicThumbnailRenderer == nil ||
		item.Thumbnail.MusicThumbnailRenderer.Thumbnail == nil {
		return ""
	}
	thumbs := item.Thumbnail.MusicThumbnailRenderer.Thumbnail.Thumbnails
	url := ""
	for _, t := range thumbs {
		if strings.HasPrefix(t.URL, "http") {
			url = t.URL
		}
	}
	return url
}

// fixedColumnDuration extracts the duration from fixedColumns (right-hand column).
func fixedColumnDuration(item *ytMusicListItem) string {
	for _, col := range item.FixedColumns {
		fixed := col.MusicResponsiveListItemFixedColumnRenderer
		if fixed == nil || fixed.Text == nil {
			continue
		}
		for _, run := range fixed.Text.Runs {
			if durationRe.MatchString(run.Text) {
				return strings.ReplaceAll(run.Text, ".", ":")
			}
		}
	}
	return ""
}

// columnRuns concatenates all "text" runs in the i-th flex column.
func columnRuns(item *ytMusicListItem, i int) string {
	if i >= len(item.FlexColumns) {
		return ""
	}
	col := item.FlexColumns[i].MusicResponsiveListItemFlexColumnRenderer
	if col == nil || col.Text == nil {
		return ""
	}
	var sb strings.Builder
	for _, run := range col.Text.Runs {
		sb.WriteString(run.Text)
	}
	return sb.String()
}

// splitColumn returns the text parts of the i-th column, excluding the "•" separators.
func splitColumn(item *ytMusicListItem, i int) []string {
	joined := columnRuns(item, i)
	if joined == "" {
		return nil
	}
	parts := strings.Split(joined, "•")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// resolveStream calls yt-dlp to get the direct audio URL.
//
// Why yt-dlp? YouTube now requires a "po_token" for full stream access from
// a regular innertube client (without the token only the first ~512KB is
// readable), while yt-dlp always keeps up with the latest token mechanism.
func (s *musicService) resolveStream(ctx context.Context, videoID string) (string, error) {
	if !musicIDPattern.MatchString(videoID) {
		return "", ErrInvalidMusicID
	}

	s.mu.Lock()
	if entry, ok := s.streams[videoID]; ok && time.Now().Before(entry.expiry) {
		s.mu.Unlock()
		return entry.url, nil
	}
	s.mu.Unlock()

	ctx, cancel := context.WithTimeout(ctx, resolveTimeout)
	defer cancel()

	args := []string{
		"-f", "bestaudio[ext=m4a]/bestaudio", // m4a is the most compatible across browsers
		"--no-warnings",
		"--no-playlist",
		"--get-url",
		// Node is used to solve YouTube's JS challenge (BotGuard);
		// yt-dlp only enables deno by default, so node must be
		// enabled explicitly.
		"--js-runtimes", "node",
		"https://www.youtube.com/watch?v=" + videoID,
	}
	cmd := exec.CommandContext(ctx, "yt-dlp", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return "", errors.New("yt-dlp tidak terpasang di server (pip install yt-dlp)")
		}
		if ctx.Err() != nil {
			return "", fmt.Errorf("%w: resolusi stream timeout", ErrStreamUnavailable)
		}
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("%w: %s", ErrStreamUnavailable, firstMeaningfulLine(msg))
	}

	url := firstLine(stdout.String())
	if url == "" || !strings.HasPrefix(url, "http") {
		return "", fmt.Errorf("%w: yt-dlp tidak mengembalikan URL yang valid", ErrStreamUnavailable)
	}

	s.mu.Lock()
	s.streams[videoID] = streamEntry{url: url, expiry: time.Now().Add(streamCacheTTL)}
	s.mu.Unlock()

	return url, nil
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		s = s[:i]
	}
	return strings.TrimSpace(s)
}

// YouTube thumbnail hosts allowed to be proxied.
var allowedThumbnailHosts = []string{
	".googleusercontent.com", // lh3/yt3 (YouTube Music)
	".ytimg.com",             // i.ytimg.com (YouTube)
}

// ErrThumbnailForbidden used by handler to respond 400 Bad Request when
// the thumbnail URL does not belong to an allowed host.
var ErrThumbnailForbidden = errors.New("host thumbnail tidak diizinkan")

func (s *musicService) OpenThumbnail(ctx context.Context, rawURL string) (*http.Response, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, ErrThumbnailForbidden
	}
	allowed := false
	for _, suffix := range allowedThumbnailHosts {
		if strings.HasSuffix(parsed.Hostname(), suffix) {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, ErrThumbnailForbidden
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")

	res, err := s.searchClient.Do(req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		res.Body.Close()
		return nil, fmt.Errorf("gagal mengambil thumbnail: status %d", res.StatusCode)
	}
	return res, nil
}

// firstMeaningfulLine skips stderr lines that are just noise
// (e.g. Python deprecation warnings from yt-dlp).
func firstMeaningfulLine(s string) string {
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Deprecated Feature:") || strings.HasPrefix(line, "WARNING:") {
			continue
		}
		return line
	}
	return firstLine(s)
}

func (s *musicService) OpenStream(ctx context.Context, videoID, rangeHeader string) (*http.Response, error) {
	// At most two attempts: a cached URL may have just expired
	// (403 from googlevideo) — drop the cache and resolve once more.
	for attempt := 0; attempt < 2; attempt++ {
		streamURL, err := s.resolveStream(ctx, videoID)
		if err != nil {
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, streamURL, nil)
		if err != nil {
			return nil, err
		}
		if rangeHeader != "" {
			req.Header.Set("Range", rangeHeader)
		} else {
			// Browsers sometimes request without Range; ask for an open
			// range from byte 0 so the response stays 206 + Content-Range.
			req.Header.Set("Range", "bytes=0-")
		}

		res, err := s.streamClient.Do(req)
		if err != nil {
			return nil, err
		}

		// Expired/revoked URL → resolve again.
		if res.StatusCode == http.StatusForbidden && attempt == 0 {
			res.Body.Close()
			s.mu.Lock()
			delete(s.streams, videoID)
			s.mu.Unlock()
			continue
		}

		if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusPartialContent {
			res.Body.Close()
			return nil, fmt.Errorf("%w: upstream status %d", ErrStreamUnavailable, res.StatusCode)
		}
		return res, nil
	}
	return nil, fmt.Errorf("%w: upstream terus menolak (403)", ErrStreamUnavailable)
}
