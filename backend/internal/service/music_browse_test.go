package service

import (
	"encoding/json"
	"errors"
	"testing"
	"time"
)

func TestParseGenres(t *testing.T) {
	raw := `{"contents":{"singleColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"sectionListRenderer":{"contents":[
		{"gridRenderer":{"header":{"gridHeaderRenderer":{"title":{"runs":[{"text":"Mood & momen"}]}}},"items":[
			{"musicNavigationButtonRenderer":{"buttonText":{"runs":[{"text":"Santai"}]},"clickCommand":{"browseEndpoint":{"browseId":"FEmusic_moods_and_genres_category","params":"ggMPOg1uX1JOQWZFeDByc2Jm"}}}}
		]}},
		{"gridRenderer":{"header":{"gridHeaderRenderer":{"title":{"runs":[{"text":"Genre"}]}}},"items":[
			{"musicNavigationButtonRenderer":{"buttonText":{"runs":[{"text":"Dangdut"}]},"clickCommand":{"browseEndpoint":{"browseId":"FEmusic_moods_and_genres_category","params":"ggMPOg1uX2wyOFBacVIxMGxI"}}}},
			{"musicNavigationButtonRenderer":{"buttonText":{"runs":[{"text":"Lain"}]},"clickCommand":{"browseEndpoint":{"browseId":"FEmusic_other","params":"x"}}}}
		]}}
	]}}}}]}}}`
	var parsed ytGenresResponse
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		t.Fatal(err)
	}
	got := parseGenres(&parsed)
	if len(got) != 2 {
		t.Fatalf("want 2 genres, got %d: %+v", len(got), got)
	}
	if got[0].Name != "Santai" || got[0].Group != "mood" || got[0].ID != "ggMPOg1uX1JOQWZFeDByc2Jm" {
		t.Errorf("unexpected mood: %+v", got[0])
	}
	if got[1].Name != "Dangdut" || got[1].Group != "genre" {
		t.Errorf("unexpected genre: %+v", got[1])
	}
}

func TestParseCategoryKeepsOnlyPlaylists(t *testing.T) {
	raw := `{"header":{"musicHeaderRenderer":{"title":{"runs":[{"text":"Dangdut"}]}}},
	"contents":{"singleColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"sectionListRenderer":{"contents":[
		{"musicCarouselShelfRenderer":{"contents":[
			{"musicTwoRowItemRenderer":{"title":{"runs":[{"text":"Dangdut Lawas"}]},"subtitle":{"runs":[{"text":"Rhoma Irama"}]},
				"thumbnailRenderer":{"musicThumbnailRenderer":{"thumbnail":{"thumbnails":[{"url":"https://a/s"},{"url":"https://a/l"}]}}},
				"navigationEndpoint":{"browseEndpoint":{"browseId":"VLRDCLAK5uy_mb2_YIBK-LCLtVkq8fFY_bIvEdxjt4n6g"}}}},
			{"musicTwoRowItemRenderer":{"title":{"runs":[{"text":"Album X"}]},"navigationEndpoint":{"browseEndpoint":{"browseId":"MPREb_e3hEbxFI37F"}}}},
			{"musicTwoRowItemRenderer":{"title":{"runs":[{"text":"Video"}]},"navigationEndpoint":{}}}
		]}}
	]}}}}]}}}`
	var parsed ytCategoryResponse
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		t.Fatal(err)
	}
	got := parseCategory(&parsed)
	if got.Name != "Dangdut" || len(got.Playlists) != 1 {
		t.Fatalf("unexpected detail: %+v", got)
	}
	p := got.Playlists[0]
	if p.Title != "Dangdut Lawas" || p.Subtitle != "Rhoma Irama" || p.Thumbnail != "https://a/l" {
		t.Errorf("unexpected playlist: %+v", p)
	}
}

func playlistItemJSON(videoID, videoType string) string {
	return `{"musicResponsiveListItemRenderer":{
		"flexColumns":[
			{"musicResponsiveListItemFlexColumnRenderer":{"text":{"runs":[{"text":"Judul"}]}}},
			{"musicResponsiveListItemFlexColumnRenderer":{"text":{"runs":[{"text":"Artis"}]}}},
			{"musicResponsiveListItemFlexColumnRenderer":{"text":{"runs":[{"text":"Album"}]}}}],
		"fixedColumns":[{"musicResponsiveListItemFixedColumnRenderer":{"text":{"runs":[{"text":"4.34"}]}}}],
		"playlistItemData":{"videoId":"` + videoID + `"},
		"overlay":{"musicItemThumbnailOverlayRenderer":{"content":{"musicPlayButtonRenderer":{"playNavigationEndpoint":{"watchEndpoint":{
			"watchEndpointMusicSupportedConfigs":{"watchEndpointMusicConfig":{"musicVideoType":"` + videoType + `"}}}}}}}}}}`
}

func TestParsePlaylist(t *testing.T) {
	raw := `{"contents":{"twoColumnBrowseResultsRenderer":{
		"tabs":[{"tabRenderer":{"content":{"sectionListRenderer":{"contents":[
			{"musicResponsiveHeaderRenderer":{"title":{"runs":[{"text":"Dangdut Lawas"}]}}}]}}}}],
		"secondaryContents":{"sectionListRenderer":{"contents":[{"musicPlaylistShelfRenderer":{"contents":[` +
		playlistItemJSON("UCJxkAdP4Y4", "MUSIC_VIDEO_TYPE_ATV") + `,` +
		playlistItemJSON("UCJxkAdP4Y4", "MUSIC_VIDEO_TYPE_ATV") + `,` +
		playlistItemJSON("aaaaaaaaaaa", "MUSIC_VIDEO_TYPE_OMV") + `,` +
		playlistItemJSON("bbbbbbbbbbb", "MUSIC_VIDEO_TYPE_PODCAST_EPISODE") + `,` +
		playlistItemJSON("", "MUSIC_VIDEO_TYPE_ATV") + `]}}]}}}}}`
	var parsed ytPlaylistResponse
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		t.Fatal(err)
	}
	got := parsePlaylist(&parsed)
	if got.Title != "Dangdut Lawas" {
		t.Errorf("title = %q", got.Title)
	}
	if len(got.Tracks) != 2 {
		t.Fatalf("want 2 tracks (duplicate, podcast, unavailable dropped), got %d: %+v", len(got.Tracks), got.Tracks)
	}
	first := got.Tracks[0]
	if first.Title != "Judul" || first.Artist != "Artis" || first.Album != "Album" || first.Duration != "4:34" || first.Type != "song" {
		t.Errorf("unexpected track: %+v", first)
	}
	if got.Tracks[1].Type != "video" {
		t.Errorf("OMV should be video, got %q", got.Tracks[1].Type)
	}
}

func TestBrowseRejectsInvalidIDs(t *testing.T) {
	s := NewMusicService().(*musicService)
	if _, err := s.GenrePlaylists(t.Context(), "bad id!"); !errors.Is(err, ErrInvalidBrowseID) {
		t.Errorf("genre: want ErrInvalidBrowseID, got %v", err)
	}
	if _, err := s.Playlist(t.Context(), "PLnotVLprefixed"); !errors.Is(err, ErrInvalidBrowseID) {
		t.Errorf("playlist: want ErrInvalidBrowseID, got %v", err)
	}
}

func TestCachedBrowse(t *testing.T) {
	s := NewMusicService().(*musicService)
	calls := 0
	fetch := func() (int, error) { calls++; return calls, nil }

	for range 2 {
		if v, _ := cachedBrowse(s, "k", time.Hour, fetch); v != 1 {
			t.Fatalf("want cached 1, got %d", v)
		}
	}
	if _, err := cachedBrowse(s, "e", time.Hour, func() (int, error) { return 0, ErrBrowseNotFound }); err == nil {
		t.Fatal("error must be returned")
	}
	if _, ok := s.browseCache["e"]; ok {
		t.Error("errors must not be cached")
	}
	s.browseCache["k"] = browseEntry{data: 1, expiry: time.Now().Add(-time.Second)}
	if v, _ := cachedBrowse(s, "k", time.Hour, fetch); v != 2 {
		t.Errorf("expired entry must refetch, got %d", v)
	}
}
