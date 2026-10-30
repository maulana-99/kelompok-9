package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("username atau password salah")
	ErrUnauthorized       = errors.New("belum login")
)

type AuthService interface {
	Login(req model.LoginRequest) (*model.AuthResponse, error)
	Logout(token string) error
	GetUserByToken(token string) (*model.User, error)
}

type authService struct {
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
	jwt         JWTService
}

func NewAuthService(userRepo repository.UserRepository, sessionRepo repository.SessionRepository, jwt JWTService) AuthService {
	return &authService{userRepo: userRepo, sessionRepo: sessionRepo, jwt: jwt}
}

func (s *authService) Login(req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// One active session per user: logging in ends the previous session.
	if err := s.sessionRepo.DeleteByUserID(user.ID); err != nil {
		return nil, err
	}

	token, err := s.jwt.GenerateToken(user.ID)
	if err != nil {
		return nil, err
	}

	session := &model.Session{
		UserID: user.ID,
		Token:  token,
		Status: true,
	}
	if err := s.sessionRepo.Create(session); err != nil {
		return nil, err
	}

	return &model.AuthResponse{Token: token, User: model.NewSessionUser(user)}, nil
}

func (s *authService) Logout(token string) error {
	if token == "" {
		return ErrUnauthorized
	}
	if _, err := s.sessionRepo.FindByToken(token); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUnauthorized
		}
		return err
	}
	return s.sessionRepo.DeleteByToken(token)
}

func (s *authService) GetUserByToken(token string) (*model.User, error) {
	if token == "" {
		return nil, ErrUnauthorized
	}

	// Verifikasi tanda tangan dan masa berlaku JWT dulu.
	userID, err := s.jwt.ParseToken(token)
	if err != nil {
		return nil, ErrUnauthorized
	}

	// Token yang sudah di-logout (dihapus dari session) tetap ditolak.
	session, err := s.sessionRepo.FindByToken(token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}
	if !session.Status || session.UserID != userID {
		return nil, ErrUnauthorized
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}
	return user, nil
}
