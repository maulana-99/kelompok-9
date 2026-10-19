package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type PlaylistSongService interface {
	ListSongs(playlistID int, viewerID *int) (*model.Playlist, []model.PlaylistSong, error)
	AddSong(actorID int, playlistID int, req model.AddSongRequest) (*model.PlaylistSong, error)
	RemoveSong(actorID int, playlistID int, songID int) error
}

type playlistSongService struct {
	playlists repository.PlaylistRepository
	songs     repository.PlaylistSongRepository
}

func NewPlaylistSongService(playlists repository.PlaylistRepository, songs repository.PlaylistSongRepository) PlaylistSongService {
	return &playlistSongService{playlists: playlists, songs: songs}
}

func (s *playlistSongService) ListSongs(playlistID int, viewerID *int) (*model.Playlist, []model.PlaylistSong, error) {
	playlist, err := s.playlists.FindByID(playlistID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrPlaylistNotFound
		}
		return nil, nil, err
	}
	if playlist.Status == "private" && !isOwner(playlist.UserID, viewerID) {
		return nil, nil, ErrPlaylistNotFound
	}
	songs, err := s.songs.FindByPlaylist(playlistID)
	if err != nil {
		return nil, nil, err
	}
	return playlist, songs, nil
}

func (s *playlistSongService) AddSong(actorID int, playlistID int, req model.AddSongRequest) (*model.PlaylistSong, error) {
	playlist, err := s.playlists.FindByID(playlistID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlaylistNotFound
		}
		return nil, err
	}
	if playlist.UserID != actorID {
		return nil, ErrPlaylistNotFound
	}

	musicID := strings.TrimSpace(req.MusicID)
	if musicID == "" {
		return nil, errors.New("music_id wajib diisi")
	}

	song := &model.PlaylistSong{
		PlaylistID: playlistID,
		MusicID:    musicID,
	}
	if err := s.songs.Create(song); err != nil {
		if errors.Is(err, repository.ErrDuplicate) {
			return nil, ErrSongDuplicate
		}
		return nil, err
	}
	return song, nil
}

func (s *playlistSongService) RemoveSong(actorID int, playlistID int, songID int) error {
	playlist, err := s.playlists.FindByID(playlistID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPlaylistNotFound
		}
		return err
	}
	if playlist.UserID != actorID {
		return ErrPlaylistNotFound
	}

	song, err := s.songs.FindByID(songID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSongNotFound
		}
		return err
	}
	if song.PlaylistID != playlistID {
		return ErrSongNotFound
	}
	return s.songs.Delete(songID)
}
