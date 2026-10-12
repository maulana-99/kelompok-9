package model

import "time"

type PlaylistSong struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	PlaylistID int       `gorm:"not null;index;uniqueIndex:playlist_song_unique_track" json:"playlist_id"`
	MusicID    string    `gorm:"type:varchar(255);uniqueIndex:playlist_song_unique_track" json:"music_id"`
	Status     string    `gorm:"type:varchar(50)" json:"status"`
	Title      string    `gorm:"type:varchar(255)" json:"title"`
	Artist     string    `gorm:"type:varchar(255)" json:"artist"`
	Album      string    `gorm:"type:varchar(255)" json:"album"`
	Duration   string    `gorm:"type:varchar(20)" json:"duration"`
	Explicit   bool      `gorm:"not null;default:false" json:"explicit"`
	Added      string    `gorm:"type:varchar(100)" json:"added"`
	VideoID    string    `gorm:"type:varchar(255)" json:"video_id"`
	Thumbnail  string    `gorm:"type:text" json:"thumbnail"`
	CreatedAt  time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (PlaylistSong) TableName() string {
	return "playlist_song"
}
