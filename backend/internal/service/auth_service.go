package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"crypto/rand"
	"encoding/hex"
	"errors"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ErrInvalidCredentials used by handler to response 401 Unauthorized.
var ErrInvalidCredentials = errors.New("username atau password salah")

// ErrUnauthorized are used when the token unrecognized / user session was ended.
var ErrUnauthorized = errors.New("belum login")

type AuthService interface {
	Login(req model.LoginRequest) (*model.AuthResponse, error)
	Logout(token string) error
	GetUserByToken(token string) (*model.User, error)
}

type authService struct {
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
}

func NewAuthService(userRepo repository.UserRepository, sessionRepo repository.SessionRepository) AuthService {
	return &authService{userRepo: userRepo, sessionRepo: sessionRepo}
}

func (s *authService) Login(req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		// User not found or wrong password 
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// one login = one new session, old session will terminated
	if err := s.sessionRepo.DeleteByUserID(user.ID); err != nil {
		return nil, err
	}

	token, err := generateToken()
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

	return &model.AuthResponse{Token: token, User: user}, nil
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

	session, err := s.sessionRepo.FindByToken(token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}
	if !session.Status {
		return nil, ErrUnauthorized
	}

	user, err := s.userRepo.FindByID(session.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUnauthorized
		}
		return nil, err
	}
	return user, nil
}

// generateToken generate a 32 byte random token using crypto/rand, hopefully the user cant guess it hehe..
func generateToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
