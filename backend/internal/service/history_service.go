package service

import (
	"backend/internal/model"
	"backend/internal/repository"
)

const (
	DefaultHistoryLimit = 20
	MaxHistoryLimit     = 100
)

type HistoryService interface {
	Record(userID int, musicID string) (*model.UserListeningHistory, error)
	List(userID int, limit int) ([]model.UserListeningHistory, error)
	Clear(userID int) error
}

type historyService struct {
	repo repository.HistoryRepository
}

func NewHistoryService(repo repository.HistoryRepository) HistoryService {
	return &historyService{repo: repo}
}

func (s *historyService) Record(userID int, musicID string) (*model.UserListeningHistory, error) {
	return s.repo.Touch(userID, musicID)
}

func (s *historyService) List(userID int, limit int) ([]model.UserListeningHistory, error) {
	if limit <= 0 {
		limit = DefaultHistoryLimit
	}
	if limit > MaxHistoryLimit {
		limit = MaxHistoryLimit
	}
	return s.repo.FindByUser(userID, limit)
}

func (s *historyService) Clear(userID int) error {
	return s.repo.DeleteByUser(userID)
}
