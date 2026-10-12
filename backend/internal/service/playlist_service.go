package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

var (
	ErrInvalidPlaylistID = errors.New("id playlist tidak valid")
	ErrInvalidPlaylist   = errors.New("nama playlist wajib diisi")
	ErrDuplicateTrack    = errors.New("lagu duplikat di dalam playlist")
)

type PlaylistService interface {
	List(userID int) ([]model.PlaylistResponse, error)
	Get(userID int, id string) (*model.PlaylistResponse, error)
	Create(userID int, req model.CreatePlaylistRequest) (*model.PlaylistResponse, error)
}

type playlistService struct {
	repo repository.PlaylistRepository
}

func NewPlaylistService(repo repository.PlaylistRepository) PlaylistService {
	return &playlistService{repo: repo}
}

func (s *playlistService) List(userID int) ([]model.PlaylistResponse, error) {
	playlists, err := s.repo.ListByUserID(userID)
	if err != nil {
		return nil, err
	}
	result := make([]model.PlaylistResponse, 0, len(playlists))
	for _, playlist := range playlists {
		_, songs, err := s.repo.FindByID(userID, playlist.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, playlistResponse(&playlist, songs))
	}
	return result, nil
}

func (s *playlistService) Get(userID int, id string) (*model.PlaylistResponse, error) {
	playlistID, err := parsePlaylistID(id)
	if err != nil {
		return nil, ErrInvalidPlaylistID
	}
	playlist, songs, err := s.repo.FindByID(userID, playlistID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	result := playlistResponse(playlist, songs)
	return &result, nil
}

func (s *playlistService) Create(userID int, req model.CreatePlaylistRequest) (*model.PlaylistResponse, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, ErrInvalidPlaylist
	}
	playlist, songs, err := s.repo.Create(userID, req)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateTrack) {
			return nil, ErrDuplicateTrack
		}
		return nil, err
	}
	result := playlistResponse(playlist, songs)
	return &result, nil
}

func parsePlaylistID(value string) (int, error) {
	value = strings.TrimPrefix(value, "p")
	id, err := strconv.Atoi(value)
	if err != nil || id < 1 {
		return 0, ErrInvalidPlaylistID
	}
	return id, nil
}

func playlistResponse(playlist *model.Playlist, songs []model.PlaylistSong) model.PlaylistResponse {
	trackIDs := make([]string, 0, len(songs))
	tracks := make([]model.PlaylistTrackInput, 0, len(songs))
	totalSeconds := 0
	for _, song := range songs {
		trackIDs = append(trackIDs, song.MusicID)
		tracks = append(tracks, model.PlaylistTrackInput{
			ID:        song.MusicID,
			Title:     song.Title,
			Artist:    song.Artist,
			Album:     song.Album,
			Duration:  song.Duration,
			Explicit:  song.Explicit,
			Added:     song.Added,
			VideoID:   song.VideoID,
			Thumbnail: song.Thumbnail,
		})
		totalSeconds += durationSeconds(song.Duration)
	}
	return model.PlaylistResponse{
		ID:            fmt.Sprintf("p%d", playlist.ID),
		Name:          playlist.Title,
		Description:   playlist.Description,
		Cover:         playlist.Cover,
		TrackCount:    len(trackIDs),
		DurationLabel: durationLabel(totalSeconds),
		TrackIDs:      trackIDs,
		Tracks:        tracks,
	}
}

func durationSeconds(duration string) int {
	var minutes, seconds int
	if _, err := fmt.Sscanf(duration, "%d:%d", &minutes, &seconds); err != nil || seconds > 59 {
		return 0
	}
	return minutes*60 + seconds
}

func durationLabel(totalSeconds int) string {
	minutes := (totalSeconds + 30) / 60
	if minutes < 60 {
		return fmt.Sprintf("%d min", minutes)
	}
	return fmt.Sprintf("%d hr %02d min", minutes/60, minutes%60)
}
