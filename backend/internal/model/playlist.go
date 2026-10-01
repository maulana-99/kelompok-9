package model

import "time"

type Playlist struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255)" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	UserID      int       `gorm:"not null;index" json:"user_id"`
	Status      string    `gorm:"type:varchar(50)" json:"status"`
	CreatedAt   time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (Playlist) TableName() string {
	return "playlist"
}
