package repository

import (
	"backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type LikeRepository interface {
	Create(like *model.LikedSong) error
	FindByUserAndMusicID(userID int, musicID string) (*model.LikedSong, error)
	FindByUserID(userID int) ([]model.LikedSong, error)
	DeleteByUserAndMusicID(userID int, musicID string) (int64, error)
}

type likeRepository struct {
	db *gorm.DB
}

func NewLikeRepository(db *gorm.DB) LikeRepository {
	return &likeRepository{db: db}
}

func (r *likeRepository) Create(like *model.LikedSong) error {
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "user_id"},
			{Name: "music_id"},
		},
		DoNothing: true,
	}).Create(like).Error
}

func (r *likeRepository) FindByUserAndMusicID(
	userID int,
	musicID string,
) (*model.LikedSong, error) {
	var like model.LikedSong

	err := r.db.
		Where("user_id = ? AND music_id = ?", userID, musicID).
		First(&like).Error
	if err != nil {
		return nil, err
	}

	return &like, nil
}

func (r *likeRepository) FindByUserID(
	userID int,
) ([]model.LikedSong, error) {
	var likes []model.LikedSong

	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&likes).Error
	if err != nil {
		return nil, err
	}

	return likes, nil
}

func (r *likeRepository) DeleteByUserAndMusicID(
	userID int,
	musicID string,
) (int64, error) {
	result := r.db.
		Where("user_id = ? AND music_id = ?", userID, musicID).
		Delete(&model.LikedSong{})

	return result.RowsAffected, result.Error
}
