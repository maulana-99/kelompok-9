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
	GetAllUsers(query string, page, limit int) (model.Page[model.User], error)
	GetUserByID(id int, viewerID int) (*model.UserDetailResponse, error)
	UpdateUser(id int, req model.UpdateUserRequest) (*model.User, error)
	DeleteUser(id int) error

	// Tipe return disamakan jadi model.Page berisi []model.User
	GetFollowers(id int, page, limit int) (model.Page[model.User], error)
	GetFollowing(id int, page, limit int) (model.Page[model.User], error)

	FollowUser(followerID int, followingID int) error
	UnfollowUser(followerID int, followingID int) error
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

func (s *userService) GetAllUsers(query string, page, limit int) (model.Page[model.User], error) {
	users, total, err := s.repo.FindAll(strings.TrimSpace(query), limit, (page-1)*limit)
	if err != nil {
		return model.Page[model.User]{}, err
	}
	return model.NewPage(users, page, limit, total), nil
}

// findUser loads the raw user record for internal use (update/delete).
func (s *userService) findUser(id int) (*model.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetUserByID builds the public user detail; when viewerID > 0 (peminta
// login), is_following ikut diisi supaya UI tidak perlu menebaknya dari
// daftar follower yang sekarang dipaginasi.
func (s *userService) GetUserByID(id int, viewerID int) (*model.UserDetailResponse, error) {
	user, err := s.findUser(id)
	if err != nil {
		return nil, err
	}
	detail := &model.UserDetailResponse{
		ID:        user.ID,
		Name:      user.Name,
		Username:  user.Username,
		CreatedAt: user.CreatedAt,
	}
	if viewerID > 0 {
		following, err := s.repo.IsFollowing(viewerID, id)
		if err == nil {
			detail.IsFollowing = &following
		}
	}
	return detail, nil
}

func (s *userService) UpdateUser(id int, req model.UpdateUserRequest) (*model.User, error) {
	user, err := s.findUser(id)
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
	if _, err := s.findUser(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func (s *userService) GetFollowers(id int, page, limit int) (model.Page[model.User], error) {
	// Panggil s.repo (bukan s.userRepo)
	_, err := s.repo.FindByID(id)
	if err != nil {
		return model.Page[model.User]{}, ErrNotFound
	}
	followers, total, err := s.repo.GetFollowers(id, limit, (page-1)*limit)
	if err != nil {
		return model.Page[model.User]{}, err
	}
	return model.NewPage(followers, page, limit, total), nil
}

func (s *userService) GetFollowing(id int, page, limit int) (model.Page[model.User], error) {
	// Panggil s.repo (bukan s.userRepo)
	_, err := s.repo.FindByID(id)
	if err != nil {
		return model.Page[model.User]{}, ErrNotFound
	}
	following, total, err := s.repo.GetFollowing(id, limit, (page-1)*limit)
	if err != nil {
		return model.Page[model.User]{}, err
	}
	return model.NewPage(following, page, limit, total), nil
}

func (s *userService) FollowUser(followerID int, followingID int) error {
	if followerID == followingID {
		return errors.New("tidak bisa follow diri sendiri")
	}
	_, err := s.repo.FindByID(followingID)
	if err != nil {
		return ErrNotFound
	}
	return s.repo.Follow(followerID, followingID)
}

func (s *userService) UnfollowUser(followerID int, followingID int) error {
	_, err := s.repo.FindByID(followingID)
	if err != nil {
		return ErrNotFound
	}
	return s.repo.Unfollow(followerID, followingID)
}

// hashPassword memakai bcrypt. Password plaintext tidak pernah disimpan ke DB.
func hashPassword(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}