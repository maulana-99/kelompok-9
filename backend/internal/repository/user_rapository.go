package repository

import (
	"backend/internal/model"
	"strings"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *model.User) error
	FindAll(query string, limit, offset int) ([]model.User, int64, error)
	FindByID(id int) (*model.User, error)
	FindByUsername(username string) (*model.User, error)
	Update(user *model.User) error
	Delete(id int) error

	GetFollowers(userID int, limit, offset int) ([]model.User, int64, error)
	GetFollowing(userID int, limit, offset int) ([]model.User, int64, error)

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

// FindAll returns one page of users (optional name/username filter) plus the
// total match count. Ordered by id so offset paging stays stable.
func (r *userRepository) FindAll(query string, limit, offset int) ([]model.User, int64, error) {
	var (
		users []model.User
		total int64
	)
	filter := func(tx *gorm.DB) *gorm.DB {
		if query != "" {
			pattern := "%" + escapeLike(query) + "%"
			tx = tx.Where("name ILIKE ? OR username ILIKE ?", pattern, pattern)
		}
		return tx
	}
	if err := filter(r.db.Model(&model.User{})).Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := filter(r.db.Model(&model.User{})).Order("id asc").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	return users, total, nil
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

// Update writes only the profile columns. Never Save() the whole row: role is a
// privilege column and a stale read would undo a grant/revoke made meanwhile.
func (r *userRepository) Update(user *model.User) error {
	return r.db.Model(user).Select("name", "username", "password").Updates(user).Error
}

func (r *userRepository) Delete(id int) error {
	return r.db.Delete(&model.User{}, id).Error
}

// GetFollowers returns one page of users following userID plus the total.
func (r *userRepository) GetFollowers(userID int, limit, offset int) ([]model.User, int64, error) {
	var total int64
	if err := r.db.Table("follow").Where("following_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var followers []model.User
	// Ubah "follows" menjadi "follow"
	err := r.db.Joins("JOIN follow ON follow.follower_id = users.id").
		Where("follow.following_id = ?", userID).
		Order("users.id asc").
		Limit(limit).Offset(offset).
		Find(&followers).Error
	if err != nil {
		return nil, 0, err
	}
	return followers, total, nil
}

// GetFollowing returns one page of users userID follows plus the total.
func (r *userRepository) GetFollowing(userID int, limit, offset int) ([]model.User, int64, error) {
	var total int64
	if err := r.db.Table("follow").Where("follower_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var following []model.User
	// Ubah "follows" menjadi "follow"
	err := r.db.Joins("JOIN follow ON follow.following_id = users.id").
		Where("follow.follower_id = ?", userID).
		Order("users.id asc").
		Limit(limit).Offset(offset).
		Find(&following).Error
	if err != nil {
		return nil, 0, err
	}
	return following, total, nil
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
