package handler

import (
	"backend/internal/model"
	"backend/internal/response"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type LikeHandler struct {
	likes service.LikeService
}

func NewLikeHandler(likes service.LikeService) *LikeHandler {
	return &LikeHandler{likes: likes}
}

func (h *LikeHandler) Create(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	userID, ok := userIDValue.(int)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "user tidak valid", nil)
		return
	}

	var req model.CreateLikeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "data like tidak valid", nil)
		return
	}

	like, err := h.likes.LikeSong(userID, req.MusicID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidMusicID) {
			response.Error(c, http.StatusBadRequest, err.Error(), nil)
			return
		}

		response.Error(c, http.StatusInternalServerError, "gagal menyukai lagu", nil)
		return
	}

	response.Success(c, http.StatusOK, "lagu berhasil disukai", like)
}

func (h *LikeHandler) List(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	userID, ok := userIDValue.(int)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "user tidak valid", nil)
		return
	}

	likes, err := h.likes.GetLikedSongs(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mengambil daftar lagu yang disukai", nil)
		return
	}

	response.Success(c, http.StatusOK, "daftar lagu yang disukai berhasil diambil", likes)
}

func (h *LikeHandler) Delete(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	userID, ok := userIDValue.(int)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "user tidak valid", nil)
		return
	}

	musicID := c.Param("musicId")
	err := h.likes.UnlikeSong(userID, musicID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidMusicID) {
			response.Error(c, http.StatusBadRequest, err.Error(), nil)
			return
		}

		if errors.Is(err, service.ErrLikeNotFound) {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}

		response.Error(c, http.StatusInternalServerError, "gagal membatalkan like", nil)
		return
	}

	response.Success(c, http.StatusOK, "like berhasil dibatalkan", nil)
}
