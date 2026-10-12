package handler

import (
	"backend/internal/model"
	"backend/internal/response"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PlaylistHandler struct {
	service service.PlaylistService
}

func NewPlaylistHandler(s service.PlaylistService) *PlaylistHandler {
	return &PlaylistHandler{service: s}
}

func (h *PlaylistHandler) List(c *gin.Context) {
	playlists, err := h.service.List(c.GetInt("userID"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mengambil playlist", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil playlist", playlists)
}

func (h *PlaylistHandler) Get(c *gin.Context) {
	playlist, err := h.service.Get(c.GetInt("userID"), c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNotFound):
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
		case errors.Is(err, service.ErrInvalidPlaylistID):
			response.Error(c, http.StatusBadRequest, err.Error(), nil)
		default:
			response.Error(c, http.StatusInternalServerError, "gagal mengambil playlist", err.Error())
		}
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil playlist", playlist)
}

func (h *PlaylistHandler) Create(c *gin.Context) {
	var req model.CreatePlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}
	playlist, err := h.service.Create(c.GetInt("userID"), req)
	if err != nil {
		if errors.Is(err, service.ErrDuplicateTrack) || errors.Is(err, service.ErrInvalidPlaylist) {
			response.Error(c, http.StatusBadRequest, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal membuat playlist", err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "playlist berhasil dibuat", playlist)
}
