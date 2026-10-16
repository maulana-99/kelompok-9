package model

import "time"

type Playlist struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255)" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	UserID      int       `gorm:"not null;index" json:"user_id"`
	Status      string    `gorm:"type:varchar(50)" json:"status"`
	CreatedAt   time.Time `gorm:"type:timestamp;not null;default:now()" json:"created_at"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Playlist) TableName() string {
	return "playlist"
}

type CreatePlaylistRequest struct {
	Title       string `json:"title" binding:"required,min=1,max=255"`
	Description string `json:"description" binding:"omitempty,max=5000"`
	Status      string `json:"status" binding:"omitempty,oneof=public private"`
}

type UpdatePlaylistRequest struct {
	Title       string `json:"title" binding:"omitempty,min=1,max=255"`
	Description string `json:"description" binding:"omitempty,max=5000"`
	Status      string `json:"status" binding:"omitempty,oneof=public private"`
}

type PlaylistResponse struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	UserID      int       `json:"user_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type PlaylistDetailResponse struct {
	ID          int            `json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	UserID      int            `json:"user_id"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	Songs       []PlaylistSong `json:"songs"`
}

func ToPlaylistResponse(p *Playlist) PlaylistResponse {
	return PlaylistResponse{
		ID:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		UserID:      p.UserID,
		Status:      p.Status,
		CreatedAt:   p.CreatedAt,
	}
}

func ToPlaylistDetailResponse(p *Playlist, songs []PlaylistSong) PlaylistDetailResponse {
	if songs == nil {
		songs = []PlaylistSong{}
	}
	return PlaylistDetailResponse{
		ID:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		UserID:      p.UserID,
		Status:      p.Status,
		CreatedAt:   p.CreatedAt,
		Songs:       songs,
	}
}
