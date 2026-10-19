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

type PlaylistSongHandler struct {
	songs service.PlaylistSongService
	auth  service.AuthService
}

func NewPlaylistSongHandler(songs service.PlaylistSongService, auth service.AuthService) *PlaylistSongHandler {
	return &PlaylistSongHandler{songs: songs, auth: auth}
}

// GET /api/v1/playlists/:id/songs (optional auth, follows playlist visibility)
func (h *PlaylistSongHandler) List(c *gin.Context) {
	playlistID, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	_, songs, err := h.songs.ListSongs(playlistID, h.optionalViewerID(c))
	if err != nil {
		if errors.Is(err, service.ErrPlaylistNotFound) {
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal mengambil daftar lagu", nil)
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil daftar lagu", songs)
}

// POST /api/v1/playlists/:id/songs (auth, owner-only)
func (h *PlaylistSongHandler) Add(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}
	currentUserID := userIDVal.(int)

	playlistID, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	var req model.AddSongRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}

	song, err := h.songs.AddSong(currentUserID, playlistID, req)
	if err != nil {
		if errors.Is(err, service.ErrPlaylistNotFound) {
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
			return
		}
		if errors.Is(err, service.ErrSongDuplicate) {
			response.Error(c, http.StatusConflict, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "lagu berhasil ditambahkan ke playlist", song)
}

// DELETE /api/v1/playlists/:id/songs/:songId (auth, owner-only)
// :songId is the playlist_song row id (primary key), not the music_id.
func (h *PlaylistSongHandler) Delete(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}
	currentUserID := userIDVal.(int)

	playlistID, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}
	songID, err := parseSongID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "songId tidak valid", nil)
		return
	}

	if err := h.songs.RemoveSong(currentUserID, playlistID, songID); err != nil {
		if errors.Is(err, service.ErrPlaylistNotFound) {
			response.Error(c, http.StatusNotFound, "playlist tidak ditemukan", nil)
			return
		}
		if errors.Is(err, service.ErrSongNotFound) {
			response.Error(c, http.StatusNotFound, "lagu tidak ditemukan di playlist", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal hapus lagu dari playlist", nil)
		return
	}

	response.Success(c, http.StatusOK, "lagu berhasil dihapus dari playlist", nil)
}

func parseSongID(c *gin.Context) (int, error) {
	id, err := strconv.Atoi(c.Param("songId"))
	if err != nil || id <= 0 {
		return 0, errors.New("invalid song id")
	}
	return id, nil
}

func (h *PlaylistSongHandler) optionalViewerID(c *gin.Context) *int {
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
