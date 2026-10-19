package repository

import (
	"backend/internal/model"

	"gorm.io/gorm"
)

// HistoryMaxRows caps the listening history kept per user.
const HistoryMaxRows = 500

type HistoryRepository interface {
	Touch(userID int, musicID string) (*model.UserListeningHistory, error)
	FindByUser(userID int, limit int) ([]model.UserListeningHistory, error)
	DeleteByUser(userID int) error
	// TopPlayed lists the user's most played songs (play_count desc).
	TopPlayed(userID int, limit int) ([]model.UserListeningHistory, error)
}

type historyRepository struct {
	db *gorm.DB
}

func NewHistoryRepository(db *gorm.DB) HistoryRepository {
	return &historyRepository{db: db}
}

// Touch keeps one row per (user, music): replaying a song only bumps last_played.
func (r *historyRepository) Touch(userID int, musicID string) (*model.UserListeningHistory, error) {
	var entry model.UserListeningHistory
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// No UNIQUE(user_id, music_id) in the ERD: serialize concurrent plays of the same song.
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?, hashtext(?))", userID, musicID).Error; err != nil {
			return err
		}
		res := tx.Model(&model.UserListeningHistory{}).
			Where("user_id = ? AND music_id = ?", userID, musicID).
			Updates(map[string]any{
				"last_played": gorm.Expr("NOW()"),
				"play_count":  gorm.Expr("play_count + 1"),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			entry = model.UserListeningHistory{UserID: userID, MusicID: musicID, PlayCount: 1}
			if err := tx.Create(&entry).Error; err != nil {
				return err
			}
			// Keep only the newest rows: history is a taste signal, not an archive.
			return tx.Exec(`DELETE FROM user_listening_history WHERE user_id = ? AND id NOT IN (
				SELECT id FROM user_listening_history WHERE user_id = ? ORDER BY last_played DESC, id DESC LIMIT ?)`,
				userID, userID, HistoryMaxRows).Error
		}
		return tx.Where("user_id = ? AND music_id = ?", userID, musicID).
			Order("last_played desc").First(&entry).Error
	})
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *historyRepository) FindByUser(userID int, limit int) ([]model.UserListeningHistory, error) {
	var entries []model.UserListeningHistory
	if err := r.db.Where("user_id = ?", userID).
		Order("last_played desc").Order("id desc").
		Limit(limit).Find(&entries).Error; err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []model.UserListeningHistory{}
	}
	return entries, nil
}

func (r *historyRepository) DeleteByUser(userID int) error {
	return r.db.Where("user_id = ?", userID).Delete(&model.UserListeningHistory{}).Error
}

func (r *historyRepository) TopPlayed(userID int, limit int) ([]model.UserListeningHistory, error) {
	var entries []model.UserListeningHistory
	if err := r.db.Where("user_id = ?", userID).
		Order("play_count desc").Order("last_played desc").
		Limit(limit).Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}
