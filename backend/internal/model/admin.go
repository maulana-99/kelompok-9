package model

import "time"

// AdminUser adalah satu baris di daftar user untuk admin (read-only).
type AdminUser struct {
	ID             int        `json:"id"`
	Name           string     `json:"name"`
	Username       string     `json:"username"`
	Role           string     `json:"role"`
	CreatedAt      time.Time  `json:"created_at"`
	PlaylistCount  int64      `json:"playlist_count"`
	LikedCount     int64      `json:"liked_count"`
	PlayCount      int64      `json:"play_count"`
	FollowersCount int64      `json:"followers_count"`
	LastPlayed     *time.Time `json:"last_played"`
}

type AdminUserList struct {
	Items []AdminUser `json:"items"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

type AdminStats struct {
	TotalUsers     int64 `json:"total_users"`
	Admins         int64 `json:"admins"`
	NewUsers7d     int64 `json:"new_users_7d"`
	ActiveUsers7d  int64 `json:"active_users_7d"`
	TotalPlaylists int64 `json:"total_playlists"`
}
