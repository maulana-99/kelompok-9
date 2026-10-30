package repository

import (
	"backend/internal/model"

	"gorm.io/gorm"
)

type AdminRepository interface {
	// ListUsers filters by username/name (case-insensitive substring), newest first.
	ListUsers(query string, limit, offset int) ([]model.AdminUser, int64, error)
	Stats() (model.AdminStats, error)
}

type adminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) ListUsers(query string, limit, offset int) ([]model.AdminUser, int64, error) {
	base := r.db.Table("users u")
	if query != "" {
		// escapeLike (user_rapository.go): "_" or "%" in the search box match literally.
		pattern := "%" + escapeLike(query) + "%"
		base = base.Where(`u.username ILIKE ? ESCAPE '\' OR u.name ILIKE ? ESCAPE '\'`, pattern, pattern)
	}

	var total int64
	if err := base.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	users := []model.AdminUser{}
	err := base.Session(&gorm.Session{}).Select(`u.id, u.name, u.username, u.role, u.created_at,
		(SELECT COUNT(*) FROM playlist p WHERE p.user_id = u.id) AS playlist_count,
		(SELECT COUNT(*) FROM user_liked_songs l WHERE l.user_id = u.id) AS liked_count,
		(SELECT COALESCE(SUM(h.play_count), 0) FROM user_listening_history h WHERE h.user_id = u.id) AS play_count,
		(SELECT COUNT(*) FROM follow f WHERE f.following_id = u.id) AS followers_count,
		(SELECT MAX(h.last_played) FROM user_listening_history h WHERE h.user_id = u.id) AS last_played`).
		Order("u.created_at DESC").Order("u.id DESC").
		Limit(limit).Offset(offset).
		Scan(&users).Error
	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (r *adminRepository) Stats() (model.AdminStats, error) {
	var stats model.AdminStats
	err := r.db.Raw(`SELECT
		(SELECT COUNT(*) FROM users) AS total_users,
		(SELECT COUNT(*) FROM users WHERE role = ?) AS admins,
		(SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users7d,
		(SELECT COUNT(DISTINCT user_id) FROM user_listening_history WHERE last_played >= NOW() - INTERVAL '7 days') AS active_users7d,
		(SELECT COUNT(*) FROM playlist) AS total_playlists`, model.RoleAdmin).
		Scan(&stats).Error
	return stats, err
}
