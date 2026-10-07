package handler

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/response"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// MusicHandler only responsible for parsing request, calling service, formatting response.
// There is no logic or http calls to YouTube here.
type MusicHandler struct {
	service service.MusicService
}

func NewMusicHandler(s service.MusicService) *MusicHandler {
	return &MusicHandler{service: s}
}

// GET /api/v1/music/search?q=&limit=
func (h *MusicHandler) Search(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		response.Error(c, http.StatusBadRequest, "parameter q wajib diisi", nil)
		return
	}

	limit := 20
	if limitParam := c.Query("limit"); limitParam != "" {
		parsed, err := strconv.Atoi(limitParam)
		if err != nil || parsed <= 0 {
			response.Error(c, http.StatusBadRequest, "parameter limit harus angka positif", nil)
			return
		}
		limit = parsed
	}

	results, err := h.service.Search(c.Request.Context(), query, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mencari lagu", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "berhasil mencari lagu", results)
}

// GET /api/v1/music/thumb?url=
// Proxy the thumbnail images so the image doesnt blocked by adblock or firewalls
// when loaded directly from Google's domain.
func (h *MusicHandler) Thumb(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		response.Error(c, http.StatusBadRequest, "parameter url wajib diisi", nil)
		return
	}

	upstream, err := h.service.OpenThumbnail(c.Request.Context(), rawURL)
	if err != nil {
		if errors.Is(err, service.ErrThumbnailForbidden) {
			response.Error(c, http.StatusBadRequest, err.Error(), nil)
		} else {
			response.Error(c, http.StatusBadGateway, "gagal mengambil thumbnail", err.Error())
		}
		return
	}
	defer upstream.Body.Close()

	if v := upstream.Header.Get("Content-Type"); v != "" {
		c.Header("Content-Type", v)
	}
	c.Header("Cache-Control", "public, max-age=86400")
	c.Writer.WriteHeader(http.StatusOK)

	_, _ = io.Copy(c.Writer, upstream.Body)
}

// GET /api/v1/music/:musicId/stream
func (h *MusicHandler) Stream(c *gin.Context) {
	upstream, err := h.service.OpenStream(c.Request.Context(), c.Param("musicId"), c.GetHeader("Range"))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidMusicID):
			response.Error(c, http.StatusBadRequest, err.Error(), nil)
		case errors.Is(err, service.ErrStreamUnavailable):
			response.Error(c, http.StatusNotFound, err.Error(), nil)
		default:
			response.Error(c, http.StatusBadGateway, "gagal mengambil stream audio", err.Error())
		}
		return
	}
	defer upstream.Body.Close()

	for _, header := range []string{"Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"} {
		if v := upstream.Header.Get(header); v != "" {
			c.Header(header, v)
		}
	}
	c.Writer.WriteHeader(upstream.StatusCode)

	_, _ = io.Copy(c.Writer, upstream.Body)
}
