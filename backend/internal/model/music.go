package model

// MusicResult adalah hasil pencarian dari YouTube Music.
// Tidak ada tabel "music" di database — data ini murni hasil scraping,
// diidentifikasi lewat VideoID (YouTube videoId).
type MusicResult struct {
	VideoID string `json:"video_id"`
	Title   string `json:"title"`
	Artist  string `json:"artist"`
	Album   string `json:"album,omitempty"`
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
	Group string `json:"group"`           // "mood" atau "genre"
	Color string `json:"color,omitempty"` // accent color "#rrggbb" from YouTube
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

// MusicMix adalah mix personal (mirip "My Mix" YouTube Music / "Daily Mix" Spotify),
// dibangun dari satu cluster lagu yang sering didengar user.
type MusicMix struct {
	ID        string        `json:"id"` // video_id seed utama
	Title     string        `json:"title"`
	Subtitle  string        `json:"subtitle"`
	Thumbnail string        `json:"thumbnail"`
	Seeds     []string      `json:"seeds"`
	Tracks    []MusicResult `json:"tracks"`
}

// Recommendations adalah respons GET /api/v1/recommendations.
type Recommendations struct {
	Mixes  []MusicMix    `json:"mixes"`
	ForYou []MusicResult `json:"for_you"`
}

// MixTrack adalah satu lagu di mix per lagu (GET /music/:musicId/mix) beserta alasannya:
// "seed" (lagu awal), "artist" (artis sama), "similar" (mirip/segenre),
// "for_you" (cocok dengan seleramu) atau "favorite" (sering kamu putar).
type MixTrack struct {
	MusicResult
	Reason string `json:"reason"`
}

// MusicLyrics adalah lirik teks biasa (tanpa timing) dari tab "Lirik" YouTube Music.
type MusicLyrics struct {
	Text   string `json:"text"`
	Source string `json:"source,omitempty"`
}
