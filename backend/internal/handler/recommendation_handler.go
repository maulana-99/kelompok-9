package handler

import (
	"backend/internal/response"
	"backend/internal/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RecommendationHandler struct {
	recommendations service.RecommendationService
}

func NewRecommendationHandler(recommendations service.RecommendationService) *RecommendationHandler {
	return &RecommendationHandler{recommendations: recommendations}
}

// GET /api/v1/recommendations (auth) — personal mixes + "for you" songs
func (h *RecommendationHandler) ForUser(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}

	result, err := h.recommendations.ForUser(c.Request.Context(), userID)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, service.ErrRecommendationUpstream) {
			status = http.StatusBadGateway
		}
		response.Error(c, status, "gagal membuat rekomendasi", nil)
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil rekomendasi", result)
}

// GET /api/v1/music/:musicId/mix (auth) — shuffled queue started from one song
func (h *RecommendationHandler) SongMix(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "belum login", nil)
		return
	}
	musicID := c.Param("musicId")
	if !musicIDPattern.MatchString(musicID) {
		response.Error(c, http.StatusBadRequest, "musicId tidak valid", nil)
		return
	}

	tracks, err := h.recommendations.SongMix(c.Request.Context(), userID, musicID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrBrowseNotFound):
			response.Error(c, http.StatusNotFound, "lagu tidak ditemukan", nil)
		case errors.Is(err, service.ErrRecommendationUpstream):
			response.Error(c, http.StatusBadGateway, "gagal membuat mix", nil)
		default:
			response.Error(c, http.StatusInternalServerError, "gagal membuat mix", nil)
		}
		return
	}
	response.Success(c, http.StatusOK, "berhasil membuat mix", tracks)
}
