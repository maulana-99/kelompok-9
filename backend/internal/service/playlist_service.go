package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"
	"strings"

	"gorm.io/gorm"
)

var (
	ErrPlaylistNotFound = errors.New("playlist tidak ditemukan")
	ErrSongNotFound     = errors.New("lagu tidak ditemukan di playlist")
	ErrSongDuplicate    = errors.New("lagu sudah ada di playlist")
)

type PlaylistService interface {
	CreatePlaylist(userID int, req model.CreatePlaylistRequest) (*model.Playlist, error)
	ListPlaylists(userID *int, status string, viewerID *int) ([]model.Playlist, error)
	GetPlaylistDetail(id int, viewerID *int) (*model.Playlist, []model.PlaylistSong, error)
	UpdatePlaylist(actorID int, id int, req model.UpdatePlaylistRequest) (*model.Playlist, error)
	DeletePlaylist(actorID int, id int) error
}

type playlistService struct {
	repo     repository.PlaylistRepository
	songRepo repository.PlaylistSongRepository
}

func NewPlaylistService(repo repository.PlaylistRepository, songRepo repository.PlaylistSongRepository) PlaylistService {
	return &playlistService{repo: repo, songRepo: songRepo}
}

func (s *playlistService) CreatePlaylist(userID int, req model.CreatePlaylistRequest) (*model.Playlist, error) {
	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "private"
	}
	if status != "public" && status != "private" {
		return nil, errors.New("status harus public atau private")
	}

	playlist := &model.Playlist{
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		UserID:      userID,
		Status:      status,
	}
	if err := s.repo.Create(playlist); err != nil {
		return nil, err
	}
	return playlist, nil
}

func (s *playlistService) ListPlaylists(userID *int, status string, viewerID *int) ([]model.Playlist, error) {
	status = strings.TrimSpace(status)
	if status != "" && status != "public" && status != "private" {
		return nil, errors.New("status harus public atau private")
	}
	return s.repo.FindAll(userID, status, viewerID)
}

// GetPlaylistDetail returns the playlist plus its song list.
// A private playlist accessed by anyone other than the owner
// replies ErrPlaylistNotFound to avoid leaking its existence.
func (s *playlistService) GetPlaylistDetail(id int, viewerID *int) (*model.Playlist, []model.PlaylistSong, error) {
	playlist, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrPlaylistNotFound
		}
		return nil, nil, err
	}
	if playlist.Status == "private" && !isOwner(playlist.UserID, viewerID) {
		return nil, nil, ErrPlaylistNotFound
	}
	songs, err := s.songRepo.FindByPlaylist(id)
	if err != nil {
		return nil, nil, err
	}
	return playlist, songs, nil
}

func (s *playlistService) UpdatePlaylist(actorID int, id int, req model.UpdatePlaylistRequest) (*model.Playlist, error) {
	playlist, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlaylistNotFound
		}
		return nil, err
	}
	if playlist.UserID != actorID {
		return nil, ErrPlaylistNotFound
	}

	if strings.TrimSpace(req.Title) != "" {
		playlist.Title = strings.TrimSpace(req.Title)
	}
	if req.Description != "" {
		playlist.Description = req.Description
	}
	if strings.TrimSpace(req.Status) != "" {
		status := strings.TrimSpace(req.Status)
		if status != "public" && status != "private" {
			return nil, errors.New("status harus public atau private")
		}
		playlist.Status = status
	}

	if err := s.repo.Update(playlist); err != nil {
		return nil, err
	}
	return playlist, nil
}

func (s *playlistService) DeletePlaylist(actorID int, id int) error {
	playlist, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPlaylistNotFound
		}
		return err
	}
	if playlist.UserID != actorID {
		return ErrPlaylistNotFound
	}
	return s.repo.Delete(id)
}

func isOwner(ownerID int, viewerID *int) bool {
	return viewerID != nil && *viewerID == ownerID
}
