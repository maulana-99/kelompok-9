package model

// MusicResult adalah hasil pencarian dari YouTube Music.
// Tidak ada tabel "music" di database — data ini murni hasil scraping,
// diidentifikasi lewat VideoID (YouTube videoId).
type MusicResult struct {
	VideoID   string `json:"video_id"`
	Title     string `json:"title"`
	Artist    string `json:"artist"`
	Album     string `json:"album,omitempty"`
	Thumbnail string `json:"thumbnail"`
	Duration  string `json:"duration"`
}
