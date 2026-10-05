package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrUsernameTaken = errors.New("username sudah dipakai")
)

type UserService interface {
	CreateUser(req model.CreateUserRequest) (*model.User, error)
	GetAllUsers(query string) ([]model.User, error)
	GetUserByID(id int) (*model.User, error)
	UpdateUser(id int, req model.UpdateUserRequest) (*model.User, error)
	DeleteUser(id int) error
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) CreateUser(req model.CreateUserRequest) (*model.User, error) {
	// Username unik: cek dulu supaya balasannya jelas, bukan error constraint DB.
	if existing, err := s.repo.FindByUsername(req.Username); err == nil && existing != nil {
		return nil, ErrUsernameTaken
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Name:     req.Name,
		Username: req.Username,
		Password: hash,
	}
	if err := s.repo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) GetAllUsers(query string) ([]model.User, error) {
	return s.repo.FindAll(strings.TrimSpace(query))
}

func (s *userService) GetUserByID(id int) (*model.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return user, nil
}

func (s *userService) UpdateUser(id int, req model.UpdateUserRequest) (*model.User, error) {
	user, err := s.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Username != "" && req.Username != user.Username {
		existing, err := s.repo.FindByUsername(req.Username)
		if err == nil && existing != nil && existing.ID != id {
			return nil, ErrUsernameTaken
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		user.Username = req.Username
	}
	if req.Password != "" {
		hash, err := hashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		user.Password = hash
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) DeleteUser(id int) error {
	if _, err := s.GetUserByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func hashPassword(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}
