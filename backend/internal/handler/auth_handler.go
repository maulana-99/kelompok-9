package handler

import (
	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/response"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service service.AuthService
}

func NewAuthHandler(s service.AuthService) *AuthHandler {
	return &AuthHandler{service: s}
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}

	auth, err := h.service.Login(req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			response.Error(c, http.StatusUnauthorized, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal login", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "login berhasil", auth)
}

// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	token := middleware.TokenFromHeader(c)

	if err := h.service.Logout(token); err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			response.Error(c, http.StatusUnauthorized, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal logout", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "logout berhasil", nil)
}

// GET /api/v1/auth/me (auth)
func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil user", user)
}
