package repository

import (
	"backend/internal/model"

	"gorm.io/gorm"
)

type SessionRepository interface {
	Create(session *model.Session) error
	FindByToken(token string) (*model.Session, error)
	DeleteByToken(token string) error
	DeleteByUserID(userID int) error
}

type sessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *sessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) Create(session *model.Session) error {
	return r.db.Create(session).Error
}

func (r *sessionRepository) FindByToken(token string) (*model.Session, error) {
	var session model.Session
	if err := r.db.Where("token = ?", token).First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *sessionRepository) DeleteByToken(token string) error {
	return r.db.Where("token = ?", token).Delete(&model.Session{}).Error
}

func (r *sessionRepository) DeleteByUserID(userID int) error {
	return r.db.Where("user_id = ?", userID).Delete(&model.Session{}).Error
}
