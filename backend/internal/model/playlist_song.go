package model

import "time"

type PlaylistSong struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	PlaylistID int       `gorm:"not null;index;uniqueIndex:playlist_song_unique_track" json:"playlist_id"`
	MusicID    string    `gorm:"type:varchar(255);uniqueIndex:playlist_song_unique_track" json:"music_id"`
	CreatedAt  time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`

	Playlist Playlist `gorm:"foreignKey:PlaylistID;constraint:OnDelete:CASCADE" json:"-"`
}

func (PlaylistSong) TableName() string {
	return "playlist_song"
}

type AddSongRequest struct {
	MusicID string `json:"music_id" binding:"required,min=1,max=255"`
}
