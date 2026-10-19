package repository

import (
	"backend/internal/model"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type PlaylistSongRepository interface {
	FindByPlaylist(playlistID int) ([]model.PlaylistSong, error)
	FindByID(id int) (*model.PlaylistSong, error)
	Create(song *model.PlaylistSong) error
	Delete(id int) error
}

type playlistSongRepository struct {
	db *gorm.DB
}

func NewPlaylistSongRepository(db *gorm.DB) PlaylistSongRepository {
	return &playlistSongRepository{db: db}
}

func (r *playlistSongRepository) FindByPlaylist(playlistID int) ([]model.PlaylistSong, error) {
	var songs []model.PlaylistSong
	if err := r.db.Where("playlist_id = ?", playlistID).Order("id asc").Find(&songs).Error; err != nil {
		return nil, err
	}
	if songs == nil {
		songs = []model.PlaylistSong{}
	}
	return songs, nil
}

func (r *playlistSongRepository) FindByID(id int) (*model.PlaylistSong, error) {
	var song model.PlaylistSong
	if err := r.db.First(&song, id).Error; err != nil {
		return nil, err
	}
	return &song, nil
}

func (r *playlistSongRepository) Create(song *model.PlaylistSong) error {
	if err := r.db.Create(song).Error; err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicate
		}
		return err
	}
	return nil
}

func (r *playlistSongRepository) Delete(id int) error {
	return r.db.Delete(&model.PlaylistSong{}, id).Error
}

var ErrDuplicate = errors.New("lagu sudah ada di playlist")

// isUniqueViolation detects UNIQUE(playlist_id, music_id) violations,
// both from the postgres driver (23505) and gorm error messages.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "23505") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "playlist_song_unique_track")
}
