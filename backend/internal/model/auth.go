package model

// LoginRequest are the JSON payload for /api/v1/auth/login (POST)
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse returned when the login were success, 
// it returns a token for client-side to keep ("Authorization: Bearer <token>")
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
