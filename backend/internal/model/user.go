package model

import "time"

type User struct {
	ID       int    `gorm:"primaryKey" json:"id"`
	Name     string `gorm:"type:varchar(100);not null" json:"name"`
	Username string `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	// Role tidak ikut di JSON User (endpoint publik /users); hanya pemilik akun
	// yang melihatnya lewat SessionUser (login & /auth/me).
	Role      string    `gorm:"type:varchar(20);not null;default:user" json:"-"`
	CreatedAt time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`
}

const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

// SessionUser adalah user yang sedang login, plus role-nya (untuk menampilkan menu admin).
type SessionUser struct {
	*User
	Role string `json:"role"`
}

func NewSessionUser(user *User) *SessionUser {
	return &SessionUser{User: user, Role: user.Role}
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

// UserDetailResponse adalah respons GET /users/:id. IsFollowing hanya diisi
// saat peminta login (nil = pengunjung anonim).
type UserDetailResponse struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	IsFollowing *bool   `json:"is_following,omitempty"`
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
