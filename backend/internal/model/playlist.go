package model

import "time"

type Playlist struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255)" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	UserID      int       `gorm:"not null;index" json:"user_id"`
	Status      string    `gorm:"type:varchar(50)" json:"status"`
	Cover       *string   `gorm:"type:text" json:"cover"`
	CreatedAt   time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (Playlist) TableName() string {
	return "playlist"
}

type PlaylistTrackInput struct {
	ID        string `json:"id" binding:"required,max=255"`
	Title     string `json:"title" binding:"max=255"`
	Artist    string `json:"artist" binding:"max=255"`
	Album     string `json:"album" binding:"max=255"`
	Duration  string `json:"duration" binding:"max=20"`
	Explicit  bool   `json:"explicit"`
	Added     string `json:"added" binding:"max=100"`
	VideoID   string `json:"videoId" binding:"max=255"`
	Thumbnail string `json:"thumbnail" binding:"max=2048"`
}

type CreatePlaylistRequest struct {
	Name        string               `json:"name" binding:"required,min=1,max=255"`
	Description string               `json:"description" binding:"max=5000"`
	Cover       *string              `json:"cover"`
	Tracks      []PlaylistTrackInput `json:"tracks"`
}

type PlaylistResponse struct {
	ID            string               `json:"id"`
	Name          string               `json:"name"`
	Description   string               `json:"description"`
	Cover         *string              `json:"cover"`
	TrackCount    int                  `json:"track_count"`
	DurationLabel string               `json:"duration_label"`
	TrackIDs      []string             `json:"track_ids"`
	Tracks        []PlaylistTrackInput `json:"tracks"`
}
