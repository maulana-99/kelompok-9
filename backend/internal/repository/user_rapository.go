package repository

import (
	"backend/internal/model"
	"strings"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *model.User) error
	FindAll(query string) ([]model.User, error)
	FindByID(id int) (*model.User, error)
	FindByUsername(username string) (*model.User, error)
	Update(user *model.User) error
	Delete(id int) error

	GetFollowers(userID int) ([]model.User, error)
	GetFollowing(userID int) ([]model.User, error)

	Follow(followerID int, followingID int) error
	Unfollow(followerID int, followingID int) error
	IsFollowing(followerID int, followingID int) (bool, error)
	
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) FindAll(query string) ([]model.User, error) {
	var users []model.User
	tx := r.db.Order("id asc")
	if query != "" {
		pattern := "%" + escapeLike(query) + "%"
		tx = tx.Where("name ILIKE ? OR username ILIKE ?", pattern, pattern)
	}
	if err := tx.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *userRepository) FindByID(id int) (*model.User, error) {
	var user model.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByUsername(username string) (*model.User, error) {
	var user model.User
	if err := r.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Delete(id int) error {
	return r.db.Delete(&model.User{}, id).Error
}

func (r *userRepository) GetFollowers(userID int) ([]model.User, error) {
	var followers []model.User
	// Ubah "follows" menjadi "follow"
	err := r.db.Joins("JOIN follow ON follow.follower_id = users.id").
		Where("follow.following_id = ?", userID).
		Find(&followers).Error
	if err != nil {
		return nil, err
	}
	return followers, nil
}

func (r *userRepository) GetFollowing(userID int) ([]model.User, error) {
	var following []model.User
	// Ubah "follows" menjadi "follow"
	err := r.db.Joins("JOIN follow ON follow.following_id = users.id").
		Where("follow.follower_id = ?", userID).
		Find(&following).Error
	if err != nil {
		return nil, err
	}
	return following, nil
}

// Implementasi fungsinya
func (r *userRepository) Follow(followerID int, followingID int) error {
	return r.db.Exec("INSERT INTO follow (follower_id, following_id) VALUES (?, ?) ON CONFLICT DO NOTHING", followerID, followingID).Error
}

func (r *userRepository) Unfollow(followerID int, followingID int) error {
	return r.db.Exec("DELETE FROM follow WHERE follower_id = ? AND following_id = ?", followerID, followingID).Error
}

func (r *userRepository) IsFollowing(followerID int, followingID int) (bool, error) {
	var count int64
	err := r.db.Table("follow").Where("follower_id = ? AND following_id = ?", followerID, followingID).Count(&count).Error
	return count > 0, err
}

// escapeLike escapes LIKE wildcards so user input is matched literally.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(s)
}
