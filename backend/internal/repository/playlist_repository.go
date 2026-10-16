package repository

import (
	"backend/internal/model"

	"gorm.io/gorm"
)

type PlaylistRepository interface {
	Create(playlist *model.Playlist) error
	FindByID(id int) (*model.Playlist, error)
	// FindAll visibility rules:
	// - nil viewerID (anonymous) -> only public playlists.
	// - set viewerID -> public playlists + the viewer's own playlists.
	// - status "private" -> restricted to the viewer's own playlists (anonymous gets an empty result).
	// - non-nil userID -> additional filter for a specific owner.
	FindAll(userID *int, status string, viewerID *int) ([]model.Playlist, error)
	Update(playlist *model.Playlist) error
	Delete(id int) error
}

type playlistRepository struct {
	db *gorm.DB
}

func NewPlaylistRepository(db *gorm.DB) PlaylistRepository {
	return &playlistRepository{db: db}
}

func (r *playlistRepository) Create(playlist *model.Playlist) error {
	return r.db.Create(playlist).Error
}

func (r *playlistRepository) FindByID(id int) (*model.Playlist, error) {
	var playlist model.Playlist
	if err := r.db.First(&playlist, id).Error; err != nil {
		return nil, err
	}
	return &playlist, nil
}

func (r *playlistRepository) FindAll(userID *int, status string, viewerID *int) ([]model.Playlist, error) {
	var playlists []model.Playlist
	tx := r.db.Order("id asc")

	if status == "private" {
		// Results are automatically restricted to the viewer's own playlists.
		if viewerID == nil {
			return []model.Playlist{}, nil
		}
		tx = tx.Where("user_id = ?", *viewerID)
		if userID != nil {
			tx = tx.Where("user_id = ?", *userID)
		}
	} else {
		if status == "public" {
			tx = tx.Where("status = ?", "public")
		} else {
			// No status filter: all public playlists plus the viewer's own.
			if viewerID == nil {
				tx = tx.Where("status = ?", "public")
			} else {
				tx = tx.Where("status = ? OR user_id = ?", "public", *viewerID)
			}
		}
		if userID != nil {
			tx = tx.Where("user_id = ?", *userID)
		}
	}

	if err := tx.Find(&playlists).Error; err != nil {
		return nil, err
	}
	if playlists == nil {
		playlists = []model.Playlist{}
	}
	return playlists, nil
}

func (r *playlistRepository) Update(playlist *model.Playlist) error {
	return r.db.Save(playlist).Error
}

func (r *playlistRepository) Delete(id int) error {
	return r.db.Delete(&model.Playlist{}, id).Error
}
