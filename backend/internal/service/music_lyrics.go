package service

import (
	"backend/internal/model"
	"context"
	"strings"
	"time"
)

// Lyrics of a song never change; "no lyrics" is cached too so it is not refetched.
const lyricsCacheTTL = 24 * time.Hour

type ytLyricsResponse struct {
	Contents *struct {
		SectionListRenderer *struct {
			Contents []struct {
				MusicDescriptionShelfRenderer *struct {
					Description ytRuns `json:"description"`
					Footer      ytRuns `json:"footer"`
				} `json:"musicDescriptionShelfRenderer"`
			} `json:"contents"`
		} `json:"sectionListRenderer"`
	} `json:"contents"`
}

func (s *musicService) Lyrics(ctx context.Context, videoID string) (model.MusicLyrics, error) {
	if !musicIDPattern.MatchString(videoID) {
		return model.MusicLyrics{}, ErrInvalidMusicID
	}
	lyrics, err := cachedBrowse(ctx, s, "lyrics:"+videoID, lyricsCacheTTL, func(ctx context.Context) (model.MusicLyrics, error) {
		browseID, err := s.lyricsBrowseID(ctx, videoID)
		if err != nil || browseID == "" {
			return model.MusicLyrics{}, err
		}
		var parsed ytLyricsResponse
		if err := s.browse(ctx, map[string]any{"browseId": browseID}, &parsed); err != nil {
			return model.MusicLyrics{}, err
		}
		return parseLyrics(&parsed), nil
	})
	if err != nil {
		return model.MusicLyrics{}, err
	}
	if lyrics.Text == "" {
		return model.MusicLyrics{}, ErrBrowseNotFound
	}
	return lyrics, nil
}

// lyricsBrowseID reads the "Lirik" tab of the watch page; it is "" when the
// song has no lyrics (the tab is then unselectable and has no endpoint).
func (s *musicService) lyricsBrowseID(ctx context.Context, videoID string) (string, error) {
	var parsed ytNextResponse
	body := map[string]any{"videoId": videoID, "isAudioOnly": true}
	if err := s.callInnertube(ctx, ytmNextURL, body, &parsed); err != nil {
		if isUpstreamNotFound(err) {
			return "", ErrBrowseNotFound
		}
		return "", err
	}
	c := parsed.Contents
	if c == nil || c.SingleColumnMusicWatchNextResultsRenderer == nil ||
		c.SingleColumnMusicWatchNextResultsRenderer.TabbedRenderer == nil ||
		c.SingleColumnMusicWatchNextResultsRenderer.TabbedRenderer.WatchNextTabbedResultsRenderer == nil {
		return "", nil
	}
	for _, tab := range c.SingleColumnMusicWatchNextResultsRenderer.TabbedRenderer.WatchNextTabbedResultsRenderer.Tabs {
		if tab.TabRenderer == nil || tab.TabRenderer.Endpoint == nil || tab.TabRenderer.Endpoint.BrowseEndpoint == nil {
			continue
		}
		if id := tab.TabRenderer.Endpoint.BrowseEndpoint.BrowseID; strings.HasPrefix(id, "MPLY") {
			return id, nil
		}
	}
	return "", nil
}

func parseLyrics(parsed *ytLyricsResponse) model.MusicLyrics {
	if parsed.Contents == nil || parsed.Contents.SectionListRenderer == nil {
		return model.MusicLyrics{}
	}
	for _, item := range parsed.Contents.SectionListRenderer.Contents {
		shelf := item.MusicDescriptionShelfRenderer
		if shelf == nil {
			continue
		}
		text := strings.TrimSpace(strings.ReplaceAll(shelf.Description.text(), "\r\n", "\n"))
		if text == "" {
			continue
		}
		return model.MusicLyrics{
			Text:   text,
			Source: strings.TrimSpace(strings.TrimPrefix(shelf.Footer.text(), "Sumber:")),
		}
	}
	return model.MusicLyrics{}
}
