package handler

import (
	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/response"
	"backend/internal/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PlaylistHandler struct {
	playlists service.PlaylistService
	auth      service.AuthService
}

func NewPlaylistHandler(playlists service.PlaylistService, auth service.AuthService) *PlaylistHandler {
	return &PlaylistHandler{playlists: playlists, auth: auth}
}

// POST /api/v1/playlists (auth)
func (h *PlaylistHandler) Create(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}
	currentUserID := userIDVal.(int)

	var req model.CreatePlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}

	playlist, err := h.playlists.CreatePlaylist(currentUserID, req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "playlist berhasil dibuat", model.ToPlaylistResponse(playlist))
}

// GET /api/v1/playlists?user_id=&status= (optional auth)
func (h *PlaylistHandler) List(c *gin.Context) {
	var userID *int
	if raw := c.Query("user_id"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			response.Error(c, http.StatusBadRequest, "user_id tidak valid", nil)
			return
		}
		userID = &parsed
	}
	status := c.Query("status")

	playlists, err := h.playlists.ListPlaylists(userID, status, h.optionalViewerID(c))
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data := make([]model.PlaylistResponse, 0, len(playlists))
	for i := range playlists {
		data = append(data, model.ToPlaylistResponse(&playlists[i]))
	}
	response.Success(c, http.StatusOK, "berhasil mengambil daftar playlist", data)
}

// GET /api/v1/playlists/:id (optional auth)
func (h *PlaylistHandler) GetByID(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	playlist, songs, err := h.playlists.GetPlaylistDetail(id, h.optionalViewerID(c))
	if err != nil {
		if errors.Is(err, service.ErrPlaylistNotFound) {
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal mengambil playlist", nil)
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil playlist", model.ToPlaylistDetailResponse(playlist, songs))
}

// PUT /api/v1/playlists/:id (auth, owner-only)
func (h *PlaylistHandler) Update(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}
	currentUserID := userIDVal.(int)

	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	var req model.UpdatePlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}

	playlist, err := h.playlists.UpdatePlaylist(currentUserID, id, req)
	if err != nil {
		if errors.Is(err, service.ErrPlaylistNotFound) {
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "playlist berhasil diupdate", model.ToPlaylistResponse(playlist))
}

// DELETE /api/v1/playlists/:id (auth, owner-only)
func (h *PlaylistHandler) Delete(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}
	currentUserID := userIDVal.(int)

	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	if err := h.playlists.DeletePlaylist(currentUserID, id); err != nil {
		if errors.Is(err, service.ErrPlaylistNotFound) {
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal hapus playlist", nil)
		return
	}

	response.Success(c, http.StatusOK, "playlist berhasil dihapus", nil)
}

// optionalViewerID reads Bearer token, if there's any (never returns 401)
// Used by public endpoints that need to know the owner of a private playlist.
func (h *PlaylistHandler) optionalViewerID(c *gin.Context) *int {
	token := middleware.TokenFromHeader(c)
	if token == "" {
		return nil
	}
	user, err := h.auth.GetUserByToken(token)
	if err != nil {
		return nil
	}
	id := user.ID
	return &id
}
