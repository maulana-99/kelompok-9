package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type UserService interface {
	CreateUser(req model.CreateUserRequest) (*model.User, error)
	GetAllUsers() ([]model.User, error)
	GetUserByID(id uint) (*model.User, error)
	UpdateUser(id uint, req model.UpdateUserRequest) (*model.User, error)
	DeleteUser(id uint) error
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) CreateUser(req model.CreateUserRequest) (*model.User, error) {
	user := &model.User{
		Name:  req.Name,
		Email: req.Email,
	}
	err := s.repo.Create(user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) GetAllUsers() ([]model.User, error) {
	return s.repo.FindAll()
}

func (s *userService) GetUserByID(id uint) (*model.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, model.ErrUserNotFound{Message: "user not found"}
		}
		return nil, err
	}
	return user, nil
}

func (s *userService) UpdateUser(id uint, req model.UpdateUserRequest) (*model.User, error) {
	user, err := s.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) DeleteUser(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
