package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"
	"strings"

	"gorm.io/gorm"
)

var ErrInvalidLikeMusicID = errors.New("music_id tidak boleh kosong")
var ErrLikeNotFound = errors.New("like tidak ditemukan")

type LikeService interface {
	LikeSong(userID int, musicID string) (*model.LikedSong, error)
	GetLikedSongs(userID int) ([]model.LikedSong, error)
	UnlikeSong(userID int, musicID string) error
}

type likeService struct {
	likes repository.LikeRepository
}

func NewLikeService(likes repository.LikeRepository) LikeService {
	return &likeService{likes: likes}
}

func (s *likeService) LikeSong(
	userID int,
	musicID string,
) (*model.LikedSong, error) {
	musicID = strings.TrimSpace(musicID)

	if musicID == "" {
		return nil, ErrInvalidMusicID
	}

	if len(musicID) > 255 {
		return nil, ErrInvalidMusicID
	}

	like := &model.LikedSong{
		UserID:  userID,
		MusicID: musicID,
	}

	if err := s.likes.Create(like); err != nil {
		return nil, err
	}

	// Ambil data yang tersimpan, termasuk jika like sudah ada.
	savedLike, err := s.likes.FindByUserAndMusicID(userID, musicID)
	if err != nil {
		return nil, err
	}

	return savedLike, nil
}

func (s *likeService) GetLikedSongs(
	userID int,
) ([]model.LikedSong, error) {
	return s.likes.FindByUserID(userID)
}

func (s *likeService) UnlikeSong(
	userID int,
	musicID string,
) error {
	musicID = strings.TrimSpace(musicID)

	if musicID == "" {
		return ErrInvalidMusicID
	}

	rowsAffected, err := s.likes.DeleteByUserAndMusicID(
		userID,
		musicID,
	)
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrLikeNotFound
	}

	return nil
}

var _ = gorm.ErrRecordNotFound
