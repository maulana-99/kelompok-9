package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"backend/internal/model"
)

// ErrInvalidBrowseID used by handler to respond 400 Bad Request.
var ErrInvalidBrowseID = errors.New("id tidak valid")

// ErrBrowseNotFound used by handler to respond 404 Not Found
// (genre/playlist does not exist or has no playable content).
var ErrBrowseNotFound = errors.New("data tidak ditemukan")

const (
	// Internal endpoint YouTube Music (innertube) for browse pages.
	ytmBrowseURL = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false"

	ytmGenresBrowseID   = "FEmusic_moods_and_genres"
	ytmCategoryBrowseID = "FEmusic_moods_and_genres_category"

	// Category list barely changes, playlist contents change more often.
	genresCacheTTL   = 24 * time.Hour
	categoryCacheTTL = 6 * time.Hour
	playlistCacheTTL = 30 * time.Minute
	// Keys come from user input (genre/playlist id), so bound the cache size.
	browseCacheMax = 500
)

var (
	// "params" of a category, e.g. "ggMPOg1uX2wyOFBacVIxMGxI".
	genreIDPattern = regexp.MustCompile(`^[A-Za-z0-9_%=-]{8,100}$`)
	// browseId of a playlist, e.g. "VLRDCLAK5uy_mb2_YIBK-LCLtVkq8fFY_bIvEdxjt4n6g".
	playlistIDPattern = regexp.MustCompile(`^VL[A-Za-z0-9_-]{10,80}$`)
)

// upstreamStatusError is returned by callInnertube on a non-200 response.
type upstreamStatusError struct{ code int }

func (e *upstreamStatusError) Error() string {
	return fmt.Sprintf("youtube music gagal: status %d", e.code)
}

type browseEntry struct {
	data   any
	expiry time.Time
}

// cachedBrowse returns the cached value for key, or calls fetch and caches its result.
func cachedBrowse[T any](s *musicService, key string, ttl time.Duration, fetch func() (T, error)) (T, error) {
	now := time.Now()
	s.browseMu.Lock()
	if entry, ok := s.browseCache[key]; ok && now.Before(entry.expiry) {
		s.browseMu.Unlock()
		return entry.data.(T), nil
	}
	s.browseMu.Unlock()

	data, err := fetch()
	if err != nil {
		return data, err
	}

	s.browseMu.Lock()
	defer s.browseMu.Unlock()
	if len(s.browseCache) >= browseCacheMax {
		for k, entry := range s.browseCache {
			if now.After(entry.expiry) {
				delete(s.browseCache, k)
			}
		}
	}
	if len(s.browseCache) < browseCacheMax {
		s.browseCache[key] = browseEntry{data: data, expiry: now.Add(ttl)}
	}
	return data, nil
}

// browse calls the innertube browse endpoint. YouTube answers 400/404 for an
// unknown browseId/params, which is mapped to ErrBrowseNotFound.
func (s *musicService) browse(ctx context.Context, body map[string]any, out any) error {
	err := s.callInnertube(ctx, ytmBrowseURL, body, out)
	var statusErr *upstreamStatusError
	if errors.As(err, &statusErr) && (statusErr.code == http.StatusBadRequest || statusErr.code == http.StatusNotFound) {
		return ErrBrowseNotFound
	}
	return err
}

type ytRuns struct {
	Runs []struct {
		Text string `json:"text"`
	} `json:"runs"`
}

func (r *ytRuns) text() string {
	if r == nil {
		return ""
	}
	var sb strings.Builder
	for _, run := range r.Runs {
		sb.WriteString(run.Text)
	}
	return sb.String()
}

type ytThumbnailRenderer struct {
	MusicThumbnailRenderer *struct {
		Thumbnail *struct {
			Thumbnails []struct {
				URL string `json:"url"`
			} `json:"thumbnails"`
		} `json:"thumbnail"`
	} `json:"musicThumbnailRenderer"`
}

// largest returns the last valid thumbnail URL (the largest one).
func (t *ytThumbnailRenderer) largest() string {
	if t == nil || t.MusicThumbnailRenderer == nil || t.MusicThumbnailRenderer.Thumbnail == nil {
		return ""
	}
	url := ""
	for _, th := range t.MusicThumbnailRenderer.Thumbnail.Thumbnails {
		if strings.HasPrefix(th.URL, "http") {
			url = th.URL
		}
	}
	return url
}

type ytBrowseEndpoint struct {
	BrowseID string `json:"browseId"`
	Params   string `json:"params"`
}

// ---- Genres ----

type ytGenresResponse struct {
	Contents *struct {
		SingleColumnBrowseResultsRenderer *struct {
			Tabs []struct {
				TabRenderer *struct {
					Content *struct {
						SectionListRenderer *struct {
							Contents []struct {
								GridRenderer *struct {
									Header *struct {
										GridHeaderRenderer *struct {
											Title *ytRuns `json:"title"`
										} `json:"gridHeaderRenderer"`
									} `json:"header"`
									Items []struct {
										MusicNavigationButtonRenderer *struct {
											ButtonText   *ytRuns `json:"buttonText"`
											ClickCommand *struct {
												BrowseEndpoint *ytBrowseEndpoint `json:"browseEndpoint"`
											} `json:"clickCommand"`
										} `json:"musicNavigationButtonRenderer"`
									} `json:"items"`
								} `json:"gridRenderer"`
							} `json:"contents"`
						} `json:"sectionListRenderer"`
					} `json:"content"`
				} `json:"tabRenderer"`
			} `json:"tabs"`
		} `json:"singleColumnBrowseResultsRenderer"`
	} `json:"contents"`
}

func (s *musicService) Genres(ctx context.Context) ([]model.MusicGenre, error) {
	return cachedBrowse(s, "genres", genresCacheTTL, func() ([]model.MusicGenre, error) {
		var parsed ytGenresResponse
		if err := s.browse(ctx, map[string]any{"browseId": ytmGenresBrowseID}, &parsed); err != nil {
			return nil, err
		}
		genres := parseGenres(&parsed)
		if len(genres) == 0 {
			return nil, errors.New("format respons genre YouTube Music berubah")
		}
		return genres, nil
	})
}

func parseGenres(parsed *ytGenresResponse) []model.MusicGenre {
	genres := []model.MusicGenre{}
	if parsed.Contents == nil || parsed.Contents.SingleColumnBrowseResultsRenderer == nil {
		return genres
	}
	for _, tab := range parsed.Contents.SingleColumnBrowseResultsRenderer.Tabs {
		if tab.TabRenderer == nil || tab.TabRenderer.Content == nil || tab.TabRenderer.Content.SectionListRenderer == nil {
			continue
		}
		for _, section := range tab.TabRenderer.Content.SectionListRenderer.Contents {
			grid := section.GridRenderer
			if grid == nil {
				continue
			}
			// Sections are "Mood & momen" and "Genre" (localized by hl=id).
			group := "mood"
			if grid.Header != nil && grid.Header.GridHeaderRenderer != nil &&
				strings.Contains(strings.ToLower(grid.Header.GridHeaderRenderer.Title.text()), "genre") {
				group = "genre"
			}
			for _, item := range grid.Items {
				button := item.MusicNavigationButtonRenderer
				if button == nil || button.ClickCommand == nil || button.ClickCommand.BrowseEndpoint == nil {
					continue
				}
				endpoint := button.ClickCommand.BrowseEndpoint
				name := button.ButtonText.text()
				if endpoint.BrowseID != ytmCategoryBrowseID || endpoint.Params == "" || name == "" {
					continue
				}
				genres = append(genres, model.MusicGenre{ID: endpoint.Params, Name: name, Group: group})
			}
		}
	}
	return genres
}

// ---- Playlists inside one genre ----

type ytTwoRowItem struct {
	Title              *ytRuns              `json:"title"`
	Subtitle           *ytRuns              `json:"subtitle"`
	ThumbnailRenderer  *ytThumbnailRenderer `json:"thumbnailRenderer"`
	NavigationEndpoint *struct {
		BrowseEndpoint *ytBrowseEndpoint `json:"browseEndpoint"`
	} `json:"navigationEndpoint"`
}

type ytTwoRowItems []struct {
	MusicTwoRowItemRenderer *ytTwoRowItem `json:"musicTwoRowItemRenderer"`
}

type ytCategoryResponse struct {
	Header *struct {
		MusicHeaderRenderer *struct {
			Title *ytRuns `json:"title"`
		} `json:"musicHeaderRenderer"`
	} `json:"header"`
	Contents *struct {
		SingleColumnBrowseResultsRenderer *struct {
			Tabs []struct {
				TabRenderer *struct {
					Content *struct {
						SectionListRenderer *struct {
							Contents []struct {
								MusicCarouselShelfRenderer *struct {
									Contents ytTwoRowItems `json:"contents"`
								} `json:"musicCarouselShelfRenderer"`
								GridRenderer *struct {
									Items ytTwoRowItems `json:"items"`
								} `json:"gridRenderer"`
							} `json:"contents"`
						} `json:"sectionListRenderer"`
					} `json:"content"`
				} `json:"tabRenderer"`
			} `json:"tabs"`
		} `json:"singleColumnBrowseResultsRenderer"`
	} `json:"contents"`
}

func (s *musicService) GenrePlaylists(ctx context.Context, genreID string) (*model.MusicGenreDetail, error) {
	if !genreIDPattern.MatchString(genreID) {
		return nil, ErrInvalidBrowseID
	}
	return cachedBrowse(s, "genre:"+genreID, categoryCacheTTL, func() (*model.MusicGenreDetail, error) {
		var parsed ytCategoryResponse
		body := map[string]any{"browseId": ytmCategoryBrowseID, "params": genreID}
		if err := s.browse(ctx, body, &parsed); err != nil {
			return nil, err
		}
		detail := parseCategory(&parsed)
		if len(detail.Playlists) == 0 {
			return nil, ErrBrowseNotFound
		}
		return detail, nil
	})
}

// parseCategory keeps only playlists (browseId "VL..."); albums and single
// videos in the category page are skipped.
func parseCategory(parsed *ytCategoryResponse) *model.MusicGenreDetail {
	detail := &model.MusicGenreDetail{Playlists: []model.MusicPlaylist{}}
	if parsed.Header != nil && parsed.Header.MusicHeaderRenderer != nil {
		detail.Name = parsed.Header.MusicHeaderRenderer.Title.text()
	}
	if parsed.Contents == nil || parsed.Contents.SingleColumnBrowseResultsRenderer == nil {
		return detail
	}
	seen := make(map[string]bool)
	add := func(items ytTwoRowItems) {
		for _, it := range items {
			r := it.MusicTwoRowItemRenderer
			if r == nil || r.NavigationEndpoint == nil || r.NavigationEndpoint.BrowseEndpoint == nil {
				continue
			}
			id := r.NavigationEndpoint.BrowseEndpoint.BrowseID
			if !playlistIDPattern.MatchString(id) || seen[id] {
				continue
			}
			seen[id] = true
			detail.Playlists = append(detail.Playlists, model.MusicPlaylist{
				ID:        id,
				Title:     r.Title.text(),
				Subtitle:  r.Subtitle.text(),
				Thumbnail: r.ThumbnailRenderer.largest(),
			})
		}
	}
	for _, tab := range parsed.Contents.SingleColumnBrowseResultsRenderer.Tabs {
		if tab.TabRenderer == nil || tab.TabRenderer.Content == nil || tab.TabRenderer.Content.SectionListRenderer == nil {
			continue
		}
		for _, section := range tab.TabRenderer.Content.SectionListRenderer.Contents {
			if section.MusicCarouselShelfRenderer != nil {
				add(section.MusicCarouselShelfRenderer.Contents)
			}
			if section.GridRenderer != nil {
				add(section.GridRenderer.Items)
			}
		}
	}
	return detail
}

// ---- Tracks inside one playlist ----

type ytPlaylistResponse struct {
	Contents *struct {
		TwoColumnBrowseResultsRenderer *struct {
			Tabs []struct {
				TabRenderer *struct {
					Content *struct {
						SectionListRenderer *struct {
							Contents []struct {
								MusicResponsiveHeaderRenderer *struct {
									Title     *ytRuns              `json:"title"`
									Thumbnail *ytThumbnailRenderer `json:"thumbnail"`
								} `json:"musicResponsiveHeaderRenderer"`
							} `json:"contents"`
						} `json:"sectionListRenderer"`
					} `json:"content"`
				} `json:"tabRenderer"`
			} `json:"tabs"`
			SecondaryContents *struct {
				SectionListRenderer *struct {
					Contents []struct {
						MusicPlaylistShelfRenderer *struct {
							Contents []struct {
								MusicResponsiveListItemRenderer *ytMusicListItem `json:"musicResponsiveListItemRenderer"`
							} `json:"contents"`
						} `json:"musicPlaylistShelfRenderer"`
					} `json:"contents"`
				} `json:"sectionListRenderer"`
			} `json:"secondaryContents"`
		} `json:"twoColumnBrowseResultsRenderer"`
	} `json:"contents"`
}

func (s *musicService) Playlist(ctx context.Context, playlistID string) (*model.MusicPlaylistDetail, error) {
	if !playlistIDPattern.MatchString(playlistID) {
		return nil, ErrInvalidBrowseID
	}
	return cachedBrowse(s, "playlist:"+playlistID, playlistCacheTTL, func() (*model.MusicPlaylistDetail, error) {
		var parsed ytPlaylistResponse
		if err := s.browse(ctx, map[string]any{"browseId": playlistID}, &parsed); err != nil {
			return nil, err
		}
		detail := parsePlaylist(&parsed)
		if len(detail.Tracks) == 0 {
			return nil, ErrBrowseNotFound
		}
		detail.ID = playlistID
		return detail, nil
	})
}

func parsePlaylist(parsed *ytPlaylistResponse) *model.MusicPlaylistDetail {
	detail := &model.MusicPlaylistDetail{Tracks: []model.MusicResult{}}
	if parsed.Contents == nil || parsed.Contents.TwoColumnBrowseResultsRenderer == nil {
		return detail
	}
	root := parsed.Contents.TwoColumnBrowseResultsRenderer
	for _, tab := range root.Tabs {
		if tab.TabRenderer == nil || tab.TabRenderer.Content == nil || tab.TabRenderer.Content.SectionListRenderer == nil {
			continue
		}
		for _, section := range tab.TabRenderer.Content.SectionListRenderer.Contents {
			if h := section.MusicResponsiveHeaderRenderer; h != nil {
				detail.Title = h.Title.text()
				detail.Thumbnail = h.Thumbnail.largest()
			}
		}
	}
	if root.SecondaryContents == nil || root.SecondaryContents.SectionListRenderer == nil {
		return detail
	}
	seen := make(map[string]bool)
	for _, section := range root.SecondaryContents.SectionListRenderer.Contents {
		if section.MusicPlaylistShelfRenderer == nil {
			continue
		}
		for _, it := range section.MusicPlaylistShelfRenderer.Contents {
			track, ok := parsePlaylistItem(it.MusicResponsiveListItemRenderer)
			if !ok || seen[track.VideoID] {
				continue
			}
			seen[track.VideoID] = true
			detail.Tracks = append(detail.Tracks, track)
		}
	}
	return detail
}

// parsePlaylistItem reads a playlist row (columns: title, artist, album; duration
// in the fixed column). Unavailable rows (no videoId) and podcast episodes are skipped.
func parsePlaylistItem(item *ytMusicListItem) (model.MusicResult, bool) {
	if item == nil || item.PlaylistItemData == nil || !musicIDPattern.MatchString(item.PlaylistItemData.VideoID) {
		return model.MusicResult{}, false
	}
	title := columnRuns(item, 0)
	if title == "" {
		return model.MusicResult{}, false
	}
	result := model.MusicResult{
		VideoID:   item.PlaylistItemData.VideoID,
		Title:     title,
		Artist:    columnRuns(item, 1),
		Album:     columnRuns(item, 2),
		Thumbnail: thumbnailURL(item),
		Duration:  fixedColumnDuration(item),
		Type:      "song",
	}
	switch musicVideoType(item) {
	case "MUSIC_VIDEO_TYPE_PODCAST_EPISODE":
		return model.MusicResult{}, false
	case "MUSIC_VIDEO_TYPE_OMV", "MUSIC_VIDEO_TYPE_UGC":
		result.Type = "video"
	}
	return result, true
}

// musicVideoType reads the item type YouTube attaches to the play button
// (ATV = audio track, OMV = official video, UGC = user upload, PODCAST_EPISODE).
func musicVideoType(item *ytMusicListItem) string {
	o := item.Overlay
	if o == nil || o.MusicItemThumbnailOverlayRenderer == nil || o.MusicItemThumbnailOverlayRenderer.Content == nil {
		return ""
	}
	button := o.MusicItemThumbnailOverlayRenderer.Content.MusicPlayButtonRenderer
	if button == nil || button.PlayNavigationEndpoint == nil || button.PlayNavigationEndpoint.WatchEndpoint == nil {
		return ""
	}
	configs := button.PlayNavigationEndpoint.WatchEndpoint.WatchEndpointMusicSupportedConfigs
	if configs == nil || configs.WatchEndpointMusicConfig == nil {
		return ""
	}
	return configs.WatchEndpointMusicConfig.MusicVideoType
}
