
package model

import "time"

type LikedSong struct {
    ID        int       `gorm:"primaryKey" json:"id"`
    UserID    int       `gorm:"not null;uniqueIndex:user_liked_songs_unique_pair" json:"user_id"`
    MusicID   string    `gorm:"type:varchar(255);not null;uniqueIndex:user_liked_songs_unique_pair" json:"music_id"`
    CreatedAt time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (LikedSong) TableName() string {
    return "user_liked_songs"
}

type CreateLikeRequest struct {
    MusicID string `json:"music_id" binding:"required,max=255"`
}
  