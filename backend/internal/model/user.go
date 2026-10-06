package model

import "time"

type User struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Username  string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

func (User) TableName() string {
	return "users"
}

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Username string `json:"username" binding:"required,min=3,max=50,alphanum"`
	Password string `json:"password" binding:"required,min=8"`
}

type UserResponse struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

type UpdateUserRequest struct {
	Name     string `json:"name" binding:"omitempty,min=2,max=100"`
	Username string `json:"username" binding:"omitempty,min=3,max=50,alphanum"`
	Password string `json:"password" binding:"omitempty,min=8"`
}

type FollowerResponse struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type ErrUserNotFound struct {
	Message string `json:"message"`
}

func (e ErrUserNotFound) Error() string {
	return e.Message
}
