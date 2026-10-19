package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strconv"
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
	// Internal endpoint YouTube Music (innertube) for track metadata by video ID.
	ytmPlayerURL = "https://music.youtube.com/youtubei/v1/player?prettyPrint=false"
	// Filter the search results to include only the songs shelf..

	ytmSongsFilter = "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"

	// Filter for the "Video" shelf (music videos, covers, remixes, MVs).
	// Replaces the previously unfiltered search: without a filter the API
	// also returns podcasts, episodes, artist profiles, etc. (query "tes" returned something about "tes urin" xD).
	ytmVideosFilter = "EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D"

	// The yt-dlp output stream URL is valid for about 6 hours, cache it for 4 hours..
	streamCacheTTL = 4 * time.Hour
	// Time limit for calling yt-dlp. Free cloud instances (Render) are slow
	// to solve the JS challenge, so 30s is not enough there.
	resolveTimeout = 90 * time.Second
	// Music metadata barely changes; cache the parsed info for a day.
	infoCacheTTL = 24 * time.Hour
	// Time limit for one innertube player call.
	infoTimeout = 15 * time.Second
	// Max parallel innertube calls inside GetInfos.
	infoWorkers = 5
)

type MusicService interface {
	// Search for songs on YouTube Music based on input query.
	Search(ctx context.Context, query string, limit int) ([]model.MusicResult, error)
	// GetInfo returns track metadata (title, artist, thumbnail, duration) for one video ID.
	GetInfo(ctx context.Context, videoID string) (model.MusicResult, error)
	// GetInfos returns track metadata for many video IDs, preserving input order.
	// Entries whose metadata could not be resolved come back as stubs
	// (video_id only, empty title) instead of failing the whole batch.
	GetInfos(ctx context.Context, videoIDs []string) ([]model.MusicResult, error)
	// OpenStream opens an audio connection for a video ID and returns an upstream response
	OpenStream(ctx context.Context, videoID, rangeHeader string) (*http.Response, error)
	// OpenThumbnail retrieves thumbnail images.
	OpenThumbnail(ctx context.Context, rawURL string) (*http.Response, error)
	// Genres lists the YouTube Music browse categories (moods and genres).
	Genres(ctx context.Context) ([]model.MusicGenre, error)
	// GenrePlaylists lists the YouTube Music playlists inside one category.
	GenrePlaylists(ctx context.Context, genreID string) (*model.MusicGenreDetail, error)
	// Playlist returns the tracks of one YouTube Music playlist.
	Playlist(ctx context.Context, playlistID string) (*model.MusicPlaylistDetail, error)
}

type musicService struct {
	// searchClient for fast JSON API calls (with a timeout).
	searchClient *http.Client
	// streamClient for audio proxy without a timeout song duration can exceed 15 seconds, canceled when the client disconnects.
	streamClient *http.Client
	// proxy is passed to yt-dlp; empty means direct connection.
	proxy string

	// Cache the stream URL for each video ID so that yt-dlp isn't called for every range request.
	mu      sync.Mutex
	streams map[string]streamEntry

	// Cache browse responses (genres, playlists): same data for every user.
	browseMu    sync.Mutex
	browseCache map[string]browseEntry
	// Cache track metadata so /music/info doesn't hit innertube for every request.
	infos map[string]infoEntry
}

type streamEntry struct {
	url    string
	expiry time.Time
}

type infoEntry struct {
	result model.MusicResult
	expiry time.Time
}

func NewMusicService() MusicService {
	// YOUTUBE_PROXY (e.g. socks5h://127.0.0.1:1080) routes all YouTube traffic
	// through one proxy, for hosts whose IP YouTube blocks (Render). yt-dlp and
	// the audio proxy must share it: stream URLs are bound to the resolving IP.
	transport := http.DefaultTransport.(*http.Transport).Clone()
	proxy := os.Getenv("YOUTUBE_PROXY")
	if proxy != "" {
		proxyURL, err := url.Parse(proxy)
		if err != nil || proxyURL.Host == "" {
			log.Printf("YOUTUBE_PROXY tidak valid, koneksi langsung dipakai: %q", proxy)
			proxy = ""
		} else {
			transport.Proxy = http.ProxyURL(proxyURL)
			log.Printf("YouTube lewat proxy %s://%s", proxyURL.Scheme, proxyURL.Host)
		}
	}
	return &musicService{
		searchClient: &http.Client{Timeout: 15 * time.Second, Transport: transport},
		streamClient: &http.Client{Transport: transport},
		proxy:        proxy,
		streams:      make(map[string]streamEntry),
		browseCache:  make(map[string]browseEntry),
		infos:        make(map[string]infoEntry),
	}
}

// ytPlayerResponse is the innertube player payload; only videoDetails is
// needed — title, author, length and largest thumbnail.
type ytPlayerResponse struct {
	VideoDetails *struct {
		VideoID       string `json:"videoId"`
		Title         string `json:"title"`
		Author        string `json:"author"`
		LengthSeconds string `json:"lengthSeconds"`
		Thumbnail     *struct {
			Thumbnails []struct {
				URL    string `json:"url"`
				Width  int    `json:"width"`
				Height int    `json:"height"`
			} `json:"thumbnails"`
		} `json:"thumbnail"`
	} `json:"videoDetails"`
}

// ytItem pairs a search item with the type ("song"/"video") derived from the
// shelf it was found in; empty for flat sections where the type label sits in
// the metadata column instead.
type ytItem struct {
	list *ytMusicListItem
	typ  string
}

func (s *musicService) Search(ctx context.Context, query string, limit int) ([]model.MusicResult, error) {
	if limit <= 0 {
		limit = 20
	}

	// Two searches run in parallel:
	//  - "Songs" filter : dense song results, complete metadata
	//  - "Videos" filter: music videos (covers, remixes, MVs) that don't appear in the songs shelf, filtered so non-music results never came in.
	var (
		wg         sync.WaitGroup
		songItems  []ytItem
		videoItems []ytItem
		songErr    error
		videoErr   error
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		parsed, err := s.fetchSearch(ctx, query, ytmSongsFilter)
		if err != nil {
			songErr = err
			return
		}
		songItems = s.collectItems(parsed)
	}()
	go func() {
		defer wg.Done()
		parsed, err := s.fetchSearch(ctx, query, ytmVideosFilter)
		if err != nil {
			videoErr = err
			return
		}
		videoItems = s.collectItems(parsed)
	}()
	wg.Wait()

	// Both fail == error. If either succeeds, its results are still used.
	if songErr != nil && videoErr != nil {
		return nil, songErr
	}

	// Merge: songs shelf results first (most relevant), reserving a few slots for
	// music videos (covers/remixes/MVs) so they still show up instead of
	// drowning in the song list.
	songCap := limit - min(5, limit/4)
	seen := make(map[string]bool)
	results := make([]model.MusicResult, 0, limit)
	addAll := func(items []ytItem, cap int) {
		for _, it := range items {
			if len(results) >= cap {
				return
			}
			listItem := it.list
			if listItem == nil || listItem.PlaylistItemData == nil || listItem.PlaylistItemData.VideoID == "" {
				continue
			}
			if seen[listItem.PlaylistItemData.VideoID] {
				continue
			}
			if result, ok := parseListItem(listItem, it.typ); ok {
				seen[result.VideoID] = true
				results = append(results, result)
			}
		}
	}
	addAll(songItems, songCap)
	addAll(videoItems, limit)
	return results, nil
}

// fetchSearch calls the innertube search API (empty params = no filter).
func (s *musicService) fetchSearch(ctx context.Context, query, params string) (*ytSearchResponse, error) {
	body := map[string]any{"query": query}
	if params != "" {
		body["params"] = params
	}
	var parsed ytSearchResponse
	if err := s.callInnertube(ctx, ytmSearchURL, body, &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

// upstreamStatusError is returned by callInnertube on a non-200 response.
type upstreamStatusError struct{ code int }

func (e *upstreamStatusError) Error() string {
	return fmt.Sprintf("youtube music gagal: status %d", e.code)
}

// callInnertube POSTs body (plus the WEB_REMIX client context) to an innertube
// endpoint and decodes the JSON response into out.
func (s *musicService) callInnertube(ctx context.Context, endpoint string, body map[string]any, out any) error {
	body["context"] = map[string]any{
		"client": map[string]any{
			"clientName":    "WEB_REMIX",
			"clientVersion": "1.20240401.01.00",
			"hl":            "id",
			"gl":            "ID",
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
	req.Header.Set("Origin", "https://music.youtube.com")
	req.Header.Set("Referer", "https://music.youtube.com/")

	res, err := s.searchClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return &upstreamStatusError{code: res.StatusCode}
	}
	return json.NewDecoder(res.Body).Decode(out)
}

// GetInfo resolves track metadata for one video ID via the innertube
// player endpoint (same approach as the thumbnail proxy: YouTube is the
// source of truth, the backend just parses the payload for the client).
func (s *musicService) GetInfo(ctx context.Context, videoID string) (model.MusicResult, error) {
	if !musicIDPattern.MatchString(videoID) {
		return model.MusicResult{}, ErrInvalidMusicID
	}

	s.mu.Lock()
	if entry, ok := s.infos[videoID]; ok && time.Now().Before(entry.expiry) {
		s.mu.Unlock()
		return entry.result, nil
	}
	s.mu.Unlock()

	ctx, cancel := context.WithTimeout(ctx, infoTimeout)
	defer cancel()

	body := map[string]any{
		"context": map[string]any{
			"client": map[string]any{
				"clientName":    "WEB_REMIX",
				"clientVersion": "1.20240401.01.00",
				"hl":            "id",
				"gl":            "ID",
			},
		},
		"videoId": videoID,
		"racyCheckOk": true,
		"contentCheckOk": true,
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return model.MusicResult{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, ytmPlayerURL, strings.NewReader(string(payload)))
	if err != nil {
		return model.MusicResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
	req.Header.Set("Origin", "https://music.youtube.com")
	req.Header.Set("Referer", "https://music.youtube.com/")

	res, err := s.searchClient.Do(req)
	if err != nil {
		return model.MusicResult{}, fmt.Errorf("youtube music info gagal: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return model.MusicResult{}, fmt.Errorf("youtube music info gagal: status %d", res.StatusCode)
	}

	var parsed ytPlayerResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return model.MusicResult{}, err
	}

	if parsed.VideoDetails == nil || parsed.VideoDetails.VideoID == "" || parsed.VideoDetails.Title == "" {
		return model.MusicResult{}, ErrStreamUnavailable
	}

	result := model.MusicResult{
		VideoID:   videoID,
		Title:     parsed.VideoDetails.Title,
		Artist:    parsed.VideoDetails.Author,
		Thumbnail: largestThumbnail(parsed.VideoDetails.Thumbnail),
		Duration:  formatLengthSeconds(parsed.VideoDetails.LengthSeconds),
		Type:      "song",
	}

	s.mu.Lock()
	s.infos[videoID] = infoEntry{result: result, expiry: time.Now().Add(infoCacheTTL)}
	s.mu.Unlock()

	return result, nil
}

// GetInfos resolves metadata for many video IDs in parallel with a small
// worker pool. Unresolvable IDs return as stubs so playlist rows stay
// visible (and still playable — streaming only needs the video ID).
func (s *musicService) GetInfos(ctx context.Context, videoIDs []string) ([]model.MusicResult, error) {
	seen := make(map[string]bool, len(videoIDs))
	unique := make([]string, 0, len(videoIDs))
	for _, id := range videoIDs {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] || !musicIDPattern.MatchString(id) {
			continue
		}
		seen[id] = true
		unique = append(unique, id)
	}

	results := make([]model.MusicResult, len(unique))
	sem := make(chan struct{}, infoWorkers)
	var wg sync.WaitGroup
	for i, id := range unique {
		wg.Add(1)
		go func(idx int, videoID string) {
			defer wg.Done()
			defer func() { <-sem }()
			sem <- struct{}{}
			result, err := s.GetInfo(ctx, videoID)
			if err != nil {
				// Stub keeps the row renderable; empty title tells the
				// client the metadata is unknown.
				results[idx] = model.MusicResult{VideoID: videoID, Type: "song"}
				return
			}
			results[idx] = result
		}(i, id)
	}
	wg.Wait()
	return results, nil
}

// largestThumbnail picks the last valid (http) thumbnail URL — innertube
// orders them ascending by size.
func largestThumbnail(thumbs *struct {
	Thumbnails []struct {
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"thumbnails"`
}) string {
	if thumbs == nil {
		return ""
	}
	url := ""
	for _, t := range thumbs.Thumbnails {
		if strings.HasPrefix(t.URL, "http") {
			url = t.URL
		}
	}
	return url
}

// formatLengthSeconds converts YouTube's "225" into "3:45" (or "57:21" style).
func formatLengthSeconds(raw string) string {
	total, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || total < 0 {
		return ""
	}
	return toClockLabel(total)
}

// toClockLabel renders seconds as "m:ss" / "h:mm:ss".
func toClockLabel(total int) string {
	hours := total / 3600
	minutes := (total % 3600) / 60
	seconds := total % 60
	if hours > 0 {
		return fmt.Sprintf("%d:%02d:%02d", hours, minutes, seconds)
	}
	return fmt.Sprintf("%d:%02d", minutes, seconds)
}

// collectItems gathers all items with a potential videoId from the two
// possible response shapes: shelf (songs/videos) and itemSection (flat results).
// Shelf items are tagged with the type implied by the shelf title, because
// their metadata column does not repeat the type label.
func (s *musicService) collectItems(parsed *ytSearchResponse) []ytItem {
	var items []ytItem
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
				shelfType := musicTypeLabels[shelfTitle(section.MusicShelfRenderer)]
				for _, item := range section.MusicShelfRenderer.Contents {
					items = append(items, ytItem{list: item.MusicResponsiveListItemRenderer, typ: shelfType})
				}
			case section.ItemSection != nil:
				for _, item := range section.ItemSection.Contents {
					items = append(items, ytItem{list: item.MusicResponsiveListItemRenderer})
				}
			}
		}
	}
	return items
}

// shelfTitle reads the localized shelf title ("Lagu", "Video").
func shelfTitle(shelf *ytMusicShelf) string {
	if shelf == nil || shelf.Title == nil || len(shelf.Title.Runs) == 0 {
		return ""
	}
	return shelf.Title.Runs[0].Text
}

// musicTypeLabels maps metadata type labels to a normalized type
// ("song"/"video") exposed on MusicResult.Type.
var musicTypeLabels = map[string]string{
	"Lagu": "song", "Song": "song",
	"Video": "video",
}

// nonMusicLabels are metadata type labels of non-music items (podcasts,
// episodes, artist/channel profiles, playlists, releases). Items carrying one
// of these labels are rejected — e.g. query "tes" used to surface the podcast
// episode "TES URINE POSITIF, BUKAN PIDANA".
var nonMusicLabels = map[string]bool{
	"Episode": true, "Podcast": true,
	"Artis": true, "Artist": true,
	"Profil": true, "Profile": true,
	"Playlist": true,
	"Single": true, "EP": true, "Album": true,
}

// An item can be a "Song" (columns: title, artist - album - duration) or a "Video" (columns: title, channel - view count - duration).
// shelfType is the type implied by the shelf the item came from ("song"/"video");
// it wins over the metadata label, which only flat-section items carry.
func parseListItem(item *ytMusicListItem, shelfType string) (model.MusicResult, bool) {
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
	// are type labels ("Video", "Lagu"), view counts, or years. On flat
	// sections the label also classifies the item, and any non-music label
	// rejects the item outright.
	itemType := shelfType
	var metaParts []string
	for _, part := range splitColumn(item, 1) {
		if t, ok := musicTypeLabels[part]; ok {
			if itemType == "" {
				itemType = t
			}
			continue
		}
		if nonMusicLabels[part] {
			return model.MusicResult{}, false
		}
		if isNoisePart(part) {
			continue
		}
		metaParts = append(metaParts, part)
	}
	if itemType == "" {
		itemType = "song"
	}
	result.Type = itemType
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
		"--no-playlist",
		"--get-url",
		// Node is used to solve YouTube's JS challenge (BotGuard);
		// yt-dlp only enables deno by default, so node must be
		// enabled explicitly.
		"--js-runtimes", "node",
	}
	if s.proxy != "" {
		args = append(args, "--proxy", s.proxy)
	}
	args = append(args, cookieArgs()...)
	// YTDLP_DEBUG puts yt-dlp's verbose output in the error response, for
	// hosts without shell access (Render free). Leave unset in normal use.
	debug := os.Getenv("YTDLP_DEBUG") != ""
	if debug {
		args = append(args, "-v")
	}
	args = append(args, "https://www.youtube.com/watch?v="+videoID)
	cmd := exec.CommandContext(ctx, "yt-dlp", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return "", errors.New("yt-dlp tidak terpasang di server (pip install yt-dlp)")
		}
		msg := strings.TrimSpace(stderr.String())
		// Full output (warnings included) shows why each player client failed.
		log.Printf("yt-dlp gagal untuk %s: %v\n%s", videoID, err, msg)
		if ctx.Err() != nil {
			return "", fmt.Errorf("%w: resolusi stream timeout", ErrStreamUnavailable)
		}
		if msg == "" {
			msg = err.Error()
		}
		if debug {
			return "", fmt.Errorf("%w: %s", ErrStreamUnavailable, msg)
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
var (
	cookieOnce sync.Once
	cookiePath string
)

// cookieArgs returns "--cookies <file>" when YTDLP_COOKIES points to a
// Netscape cookies file. Needed on cloud hosts whose IP YouTube flags as a
// bot. The file is copied to a temp path first because yt-dlp writes the
// cookie jar back on exit and secret mounts (e.g. /etc/secrets) are read-only.
func cookieArgs() []string {
	cookieOnce.Do(func() {
		src := os.Getenv("YTDLP_COOKIES")
		if src == "" {
			return
		}
		data, err := os.ReadFile(src)
		if err != nil {
			log.Printf("YTDLP_COOKIES tidak bisa dibaca: %v", err)
			return
		}
		f, err := os.CreateTemp("", "ytdlp-cookies-*.txt")
		if err != nil {
			log.Printf("gagal membuat file cookies sementara: %v", err)
			return
		}
		defer f.Close()
		if _, err := f.Write(data); err != nil {
			log.Printf("gagal menyalin cookies: %v", err)
			return
		}
		cookiePath = f.Name()
	})
	if cookiePath == "" {
		return nil
	}
	return []string{"--cookies", cookiePath}
}

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
