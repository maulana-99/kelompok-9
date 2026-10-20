package handler

import (
	"backend/internal/model"
	"backend/internal/response"
	"backend/internal/service"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type HistoryHandler struct {
	history service.HistoryService
}

func NewHistoryHandler(history service.HistoryService) *HistoryHandler {
	return &HistoryHandler{history: history}
}

// POST /api/v1/history (auth)
func (h *HistoryHandler) Record(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	var req model.RecordHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", nil)
		return
	}
	musicID := strings.TrimSpace(req.MusicID)
	if !musicIDPattern.MatchString(musicID) {
		response.Error(c, http.StatusBadRequest, "music_id tidak valid", nil)
		return
	}

	entry, err := h.history.Record(userID, musicID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mencatat riwayat dengar", nil)
		return
	}
	response.Success(c, http.StatusCreated, "riwayat dengar berhasil dicatat", entry)
}

// GET /api/v1/history?limit= (auth), newest first
func (h *HistoryHandler) List(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	limit := service.DefaultHistoryLimit
	if raw := c.Query("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			response.Error(c, http.StatusBadRequest, "parameter limit harus angka positif", nil)
			return
		}
		limit = parsed
	}

	entries, err := h.history.List(userID, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mengambil riwayat dengar", nil)
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil riwayat dengar", entries)
}

// DELETE /api/v1/history (auth)
func (h *HistoryHandler) Clear(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	if err := h.history.Clear(userID); err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal menghapus riwayat dengar", nil)
		return
	}
	response.Success(c, http.StatusOK, "riwayat dengar berhasil dihapus", nil)
}

func currentUserID(c *gin.Context) (int, bool) {
	val, exists := c.Get("userID")
	if !exists {
		return 0, false
	}
	id, ok := val.(int)
	return id, ok
}
