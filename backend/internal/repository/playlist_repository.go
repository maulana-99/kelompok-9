package repository

import (
	"backend/internal/model"
	"errors"

	"gorm.io/gorm"
)

var ErrDuplicateTrack = errors.New("lagu duplikat di dalam playlist")

type PlaylistRepository interface {
	ListByUserID(userID int) ([]model.Playlist, error)
	FindByID(userID, playlistID int) (*model.Playlist, []model.PlaylistSong, error)
	Create(userID int, req model.CreatePlaylistRequest) (*model.Playlist, []model.PlaylistSong, error)
}

type playlistRepository struct {
	db *gorm.DB
}

func NewPlaylistRepository(db *gorm.DB) PlaylistRepository {
	return &playlistRepository{db: db}
}

func (r *playlistRepository) ListByUserID(userID int) ([]model.Playlist, error) {
	var playlists []model.Playlist
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC, id DESC").Find(&playlists).Error
	return playlists, err
}

func (r *playlistRepository) FindByID(userID, playlistID int) (*model.Playlist, []model.PlaylistSong, error) {
	var playlist model.Playlist
	if err := r.db.Where("user_id = ?", userID).First(&playlist, playlistID).Error; err != nil {
		return nil, nil, err
	}

	var songs []model.PlaylistSong
	if err := r.db.Where("playlist_id = ?", playlistID).Order("created_at ASC, id ASC").Find(&songs).Error; err != nil {
		return nil, nil, err
	}
	return &playlist, songs, nil
}

func (r *playlistRepository) Create(userID int, req model.CreatePlaylistRequest) (*model.Playlist, []model.PlaylistSong, error) {
	playlist := &model.Playlist{
		Title:       req.Name,
		Description: req.Description,
		UserID:      userID,
		Status:      "active",
		Cover:       req.Cover,
	}
	songs := make([]model.PlaylistSong, 0, len(req.Tracks))
	seen := make(map[string]struct{}, len(req.Tracks))
	for _, track := range req.Tracks {
		if _, exists := seen[track.ID]; exists {
			return nil, nil, ErrDuplicateTrack
		}
		seen[track.ID] = struct{}{}
		videoID := track.VideoID
		if videoID == "" {
			videoID = track.ID
		}
		songs = append(songs, model.PlaylistSong{
			MusicID:   track.ID,
			Title:     track.Title,
			Artist:    track.Artist,
			Album:     track.Album,
			Duration:  track.Duration,
			Explicit:  track.Explicit,
			Added:     track.Added,
			VideoID:   videoID,
			Thumbnail: track.Thumbnail,
		})
	}

	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(playlist).Error; err != nil {
			return err
		}
		for i := range songs {
			songs[i].PlaylistID = playlist.ID
		}
		if len(songs) > 0 {
			return tx.Create(&songs).Error
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return playlist, songs, nil
}
