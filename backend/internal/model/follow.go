package model

// Follow merepresentasikan relasi "user mengikuti user".
//
//	FollowingID : user yang diikuti
//	FollowerID  : user yang melakukan follow
type Follow struct {
	ID          int `gorm:"primaryKey" json:"id"`
	FollowingID int `gorm:"not null;uniqueIndex:follow_unique_pair" json:"following_id"`
	FollowerID  int `gorm:"not null;uniqueIndex:follow_unique_pair" json:"follower_id"`
}

func (Follow) TableName() string {
	return "follow"
}
