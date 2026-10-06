package model

import "time"

// Follow merepresentasikan relasi "user mengikuti user".
//
//	FollowingID : user yang diikuti
//	FollowerID  : user yang melakukan follow
type Follow struct {
	ID          int `gorm:"primaryKey" json:"id"`
	FollowingID int `gorm:"not null;uniqueIndex:follow_unique_pair" json:"following_id"`
	FollowerID  int `gorm:"not null;uniqueIndex:follow_unique_pair" json:"follower_id"`
	CreatedAt   time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`

	// Relasi FK ke tabel users
	Follower  User `gorm:"foreignKey:FollowerID;constraint:OnDelete:CASCADE" json:"-"`
	Following User `gorm:"foreignKey:FollowingID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Follow) TableName() string {
	return "follow"
}
