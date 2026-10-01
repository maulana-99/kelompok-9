package model

import "time"

type UserListeningHistory struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	UserID     int       `gorm:"not null;index" json:"user_id"`
	MusicID    string    `gorm:"type:varchar(255)" json:"music_id"`
	LastPlayed time.Time `gorm:"type:timestamp;default:now()" json:"last_played"`
}

func (UserListeningHistory) TableName() string {
	return "user_listening_history"
}
