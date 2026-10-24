package service

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("token tidak valid atau kedaluwarsa")

// JWTService membuat dan memverifikasi token JWT (HS256).
type JWTService interface {
	GenerateToken(userID int) (string, error)
	ParseToken(token string) (int, error)
}

type jwtService struct {
	secret   []byte
	duration time.Duration
}

func NewJWTService(secret string, expiresHours int) JWTService {
	return &jwtService{
		secret:   []byte(secret),
		duration: time.Duration(expiresHours) * time.Hour,
	}
}

func (s *jwtService) GenerateToken(userID int) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   strconv.Itoa(userID),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(s.duration)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func (s *jwtService) ParseToken(token string) (int, error) {
	claims := &jwt.RegisteredClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secret, nil
	})
	if err != nil || !parsed.Valid {
		return 0, ErrInvalidToken
	}

	userID, err := strconv.Atoi(claims.Subject)
	if err != nil {
		return 0, ErrInvalidToken
	}
	return userID, nil
}
