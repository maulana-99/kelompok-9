package model

import "time"

type Session struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	UserID    int       `gorm:"not null;index" json:"user_id"`
	Token     string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"token"`
	Status    bool      `gorm:"type:boolean" json:"status"`
	CreatedAt time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (Session) TableName() string {
	return "session"
}
