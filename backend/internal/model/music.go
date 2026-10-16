package model

// MusicResult adalah hasil pencarian dari YouTube Music.
// Tidak ada tabel "music" di database — data ini murni hasil scraping,
// diidentifikasi lewat VideoID (YouTube videoId).
type MusicResult struct {
	VideoID   string `json:"video_id"`
	Title     string `json:"title"`
	Artist    string `json:"artist"`
	Album     string `json:"album,omitempty"`
	// Type klasifikasi item: "song" atau "video"
	Type string `json:"type,omitempty"`

	Thumbnail string `json:"thumbnail"`
	Duration  string `json:"duration"`
}

// MusicGenre adalah kategori jelajah YouTube Music (genre atau mood).
// ID adalah "params" browse milik YouTube, dipakai di GET /music/genres/:genreId.
type MusicGenre struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Group string `json:"group"` // "mood" atau "genre"
}

// MusicPlaylist adalah playlist YouTube Music (bukan playlist lokal user).
type MusicPlaylist struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle,omitempty"`
	Thumbnail string `json:"thumbnail"`
}

// MusicGenreDetail berisi playlist-playlist di dalam satu genre/mood.
type MusicGenreDetail struct {
	Name      string          `json:"name"`
	Playlists []MusicPlaylist `json:"playlists"`
}

// MusicPlaylistDetail berisi lagu-lagu di dalam satu playlist YouTube Music.
type MusicPlaylistDetail struct {
	ID        string        `json:"id"`
	Title     string        `json:"title"`
	Thumbnail string        `json:"thumbnail"`
	Tracks    []MusicResult `json:"tracks"`
}
