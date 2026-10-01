package model

import "time"

type PlaylistSong struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	PlaylistID int       `gorm:"not null;index;uniqueIndex:playlist_song_unique_track" json:"playlist_id"`
	MusicID    string    `gorm:"type:varchar(255);uniqueIndex:playlist_song_unique_track" json:"music_id"`
	Status     string    `gorm:"type:varchar(50)" json:"status"`
	CreatedAt  time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (PlaylistSong) TableName() string {
	return "playlist_song"
}
