package service

import (
	"backend/internal/model"
	"context"
	"strings"
	"time"
)

const (
	// Innertube endpoint behind the YouTube Music player queue ("Berikutnya" tab).
	ytmNextURL = "https://music.youtube.com/youtubei/v1/next?prettyPrint=false"
	// A radio for the same seed barely changes within an hour.
	radioCacheTTL = time.Hour
	// An artist's catalogue changes rarely.
	artistCacheTTL = 6 * time.Hour
)

type ytNextResponse struct {
	Contents *struct {
		SingleColumnMusicWatchNextResultsRenderer *struct {
			TabbedRenderer *struct {
				WatchNextTabbedResultsRenderer *struct {
					Tabs []struct {
						TabRenderer *struct {
							// Set on the "Lirik"/"Terkait" tabs: the browseId to open them.
							Endpoint *struct {
								BrowseEndpoint *struct {
									BrowseID string `json:"browseId"`
								} `json:"browseEndpoint"`
							} `json:"endpoint"`
							Content *struct {
								MusicQueueRenderer *struct {
									Content *struct {
										PlaylistPanelRenderer *struct {
											Contents []ytPanelItem `json:"contents"`
										} `json:"playlistPanelRenderer"`
									} `json:"content"`
								} `json:"musicQueueRenderer"`
							} `json:"content"`
						} `json:"tabRenderer"`
					} `json:"tabs"`
				} `json:"watchNextTabbedResultsRenderer"`
			} `json:"tabbedRenderer"`
		} `json:"singleColumnMusicWatchNextResultsRenderer"`
	} `json:"contents"`
}

type ytPanelItem struct {
	PlaylistPanelVideoRenderer *ytPanelVideo `json:"playlistPanelVideoRenderer"`
	// Songs with an official video come wrapped (audio track + video counterpart).
	PlaylistPanelVideoWrapperRenderer *struct {
		PrimaryRenderer *struct {
			PlaylistPanelVideoRenderer *ytPanelVideo `json:"playlistPanelVideoRenderer"`
		} `json:"primaryRenderer"`
	} `json:"playlistPanelVideoWrapperRenderer"`
}

type ytPanelVideo struct {
	VideoID        string  `json:"videoId"`
	Title          ytRuns  `json:"title"`
	LongBylineText ytRuns  `json:"longBylineText"`
	LengthText     *ytRuns `json:"lengthText"`
	Thumbnail      *struct {
		Thumbnails []struct {
			URL string `json:"url"`
		} `json:"thumbnails"`
	} `json:"thumbnail"`
	NavigationEndpoint *struct {
		WatchEndpoint *struct {
			WatchEndpointMusicSupportedConfigs *struct {
				WatchEndpointMusicConfig *struct {
					MusicVideoType string `json:"musicVideoType"`
				} `json:"watchEndpointMusicConfig"`
			} `json:"watchEndpointMusicSupportedConfigs"`
		} `json:"watchEndpoint"`
	} `json:"navigationEndpoint"`
}

func (s *musicService) Radio(ctx context.Context, videoID string) ([]model.MusicResult, error) {
	if !musicIDPattern.MatchString(videoID) {
		return nil, ErrInvalidMusicID
	}
	return cachedBrowse(ctx, s, "radio:"+videoID, radioCacheTTL, func(ctx context.Context) ([]model.MusicResult, error) {
		var parsed ytNextResponse
		body := map[string]any{
			"videoId": videoID,
			// "RDAMVM" + videoId is the radio playlist YouTube Music starts for a song.
			"playlistId":  "RDAMVM" + videoID,
			"isAudioOnly": true,
		}
		err := s.callInnertube(ctx, ytmNextURL, body, &parsed)
		if isUpstreamNotFound(err) {
			return nil, ErrBrowseNotFound
		}
		if err != nil {
			return nil, err
		}
		tracks := parseRadio(&parsed)
		if len(tracks) == 0 {
			return nil, ErrBrowseNotFound
		}
		return tracks, nil
	})
}

func parseRadio(parsed *ytNextResponse) []model.MusicResult {
	tracks := []model.MusicResult{}
	c := parsed.Contents
	if c == nil || c.SingleColumnMusicWatchNextResultsRenderer == nil ||
		c.SingleColumnMusicWatchNextResultsRenderer.TabbedRenderer == nil ||
		c.SingleColumnMusicWatchNextResultsRenderer.TabbedRenderer.WatchNextTabbedResultsRenderer == nil {
		return tracks
	}
	tabs := c.SingleColumnMusicWatchNextResultsRenderer.TabbedRenderer.WatchNextTabbedResultsRenderer.Tabs
	if len(tabs) == 0 || tabs[0].TabRenderer == nil || tabs[0].TabRenderer.Content == nil {
		return tracks
	}
	queue := tabs[0].TabRenderer.Content.MusicQueueRenderer
	if queue == nil || queue.Content == nil || queue.Content.PlaylistPanelRenderer == nil {
		return tracks
	}

	seen := make(map[string]bool)
	for _, item := range queue.Content.PlaylistPanelRenderer.Contents {
		video := item.PlaylistPanelVideoRenderer
		if video == nil && item.PlaylistPanelVideoWrapperRenderer != nil && item.PlaylistPanelVideoWrapperRenderer.PrimaryRenderer != nil {
			video = item.PlaylistPanelVideoWrapperRenderer.PrimaryRenderer.PlaylistPanelVideoRenderer
		}
		track, ok := parsePanelVideo(video)
		if !ok || seen[track.VideoID] {
			continue
		}
		seen[track.VideoID] = true
		tracks = append(tracks, track)
	}
	return tracks
}

// parsePanelVideo reads one queue row. The byline is "Artist • Album • Year"
// for songs and "Artist • views • likes" for videos.
func parsePanelVideo(video *ytPanelVideo) (model.MusicResult, bool) {
	if video == nil || !musicIDPattern.MatchString(video.VideoID) {
		return model.MusicResult{}, false
	}
	title := video.Title.text()
	if title == "" {
		return model.MusicResult{}, false
	}
	result := model.MusicResult{VideoID: video.VideoID, Title: title, Type: "song"}

	videoType := ""
	if e := video.NavigationEndpoint; e != nil && e.WatchEndpoint != nil &&
		e.WatchEndpoint.WatchEndpointMusicSupportedConfigs != nil &&
		e.WatchEndpoint.WatchEndpointMusicSupportedConfigs.WatchEndpointMusicConfig != nil {
		videoType = e.WatchEndpoint.WatchEndpointMusicSupportedConfigs.WatchEndpointMusicConfig.MusicVideoType
	}
	switch videoType {
	case "MUSIC_VIDEO_TYPE_PODCAST_EPISODE":
		return model.MusicResult{}, false
	case "MUSIC_VIDEO_TYPE_OMV", "MUSIC_VIDEO_TYPE_UGC":
		result.Type = "video"
	}

	parts := strings.Split(video.LongBylineText.text(), " • ")
	result.Artist = strings.TrimSpace(parts[0])
	if result.Type == "song" && len(parts) >= 3 {
		result.Album = strings.TrimSpace(parts[1])
	}
	// hl=id writes durations as "3.41"; the rest of the API uses "3:41".
	result.Duration = strings.ReplaceAll(video.LengthText.text(), ".", ":")
	if video.Thumbnail != nil {
		for _, th := range video.Thumbnail.Thumbnails {
			if strings.HasPrefix(th.URL, "http") {
				result.Thumbnail = th.URL
			}
		}
	}
	return result, true
}

// primaryArtist keeps the first name of a credit: "Joji & Diplo" -> "Joji".
func primaryArtist(credit string) string {
	if parts := splitArtists(credit); len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// artistMatches reports whether name is one of the artists in a credit
// ("88rising & Joji" matches "Joji", "Jojiko" does not).
func artistMatches(credit, name string) bool {
	if name == "" {
		return false
	}
	for _, part := range splitArtists(credit) {
		if strings.EqualFold(part, name) {
			return true
		}
	}
	return false
}

var artistSeparators = []string{" & ", ", ", " feat. ", " feat ", " ft. ", " x ", " dan "}

func splitArtists(credit string) []string {
	parts := []string{credit}
	for _, sep := range artistSeparators {
		next := []string{}
		for _, p := range parts {
			lower := strings.ToLower(p)
			for {
				i := strings.Index(lower, sep)
				if i < 0 {
					break
				}
				next = append(next, p[:i])
				p, lower = p[i+len(sep):], lower[i+len(sep):]
			}
			next = append(next, p)
		}
		parts = next
	}
	out := parts[:0]
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (s *musicService) ArtistSongs(ctx context.Context, artist string) ([]model.MusicResult, error) {
	name := primaryArtist(artist)
	if name == "" {
		return []model.MusicResult{}, nil
	}
	key := strings.ToLower(name)
	return cachedBrowse(ctx, s, "artist:"+key, artistCacheTTL, func(ctx context.Context) ([]model.MusicResult, error) {
		results, err := s.searchTop(ctx, name, 40)
		if err != nil {
			return nil, err
		}
		songs := []model.MusicResult{}
		for _, r := range results {
			if r.Type != "video" && artistMatches(r.Artist, name) {
				songs = append(songs, r)
			}
		}
		return songs, nil
	})
}
