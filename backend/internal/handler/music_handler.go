package handler

import (
	"errors"
	"io"
	"net/http"
	"regexp"
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

// GET /api/v1/music/info?ids=a,b,c (or repeated ids= params)
// Track metadata resolver for playlist rows: youtube music (innertube)
// is scraped server-side so no device-local cache is needed to know
// what a stored videoId actually is.
func (h *MusicHandler) Infos(c *gin.Context) {
	raw := c.QueryArray("ids")
	ids := make([]string, 0, len(raw))
	seen := make(map[string]bool)
	for _, chunk := range raw {
		for _, id := range strings.Split(chunk, ",") {
			id = strings.TrimSpace(id)
			if id == "" || seen[id] {
				continue
			}
			seen[id] = true
			ids = append(ids, id)
		}
	}

	if len(ids) == 0 {
		response.Error(c, http.StatusBadRequest, "parameter ids wajib diisi", nil)
		return
	}
	if len(ids) > 100 {
		response.Error(c, http.StatusBadRequest, "maksimal 100 id per permintaan", nil)
		return
	}
	if invalid := firstInvalidID(ids); invalid != "" {
		response.Error(c, http.StatusBadRequest, "musicId tidak valid: "+invalid, nil)
		return
	}

	results, err := h.service.GetInfos(c.Request.Context(), ids)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mengambil info lagu", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil info lagu", results)
}

// musicIDPattern mirrors service.musicIDPattern without importing internals.
var musicIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)

func firstInvalidID(ids []string) string {
	for _, id := range ids {
		if !musicIDPattern.MatchString(id) {
			return id
		}
	}
	return ""
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

// GET /api/v1/music/genres
func (h *MusicHandler) Genres(c *gin.Context) {
	genres, err := h.service.Genres(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusBadGateway, "gagal mengambil daftar genre", err.Error())
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil daftar genre", genres)
}

// GET /api/v1/music/genres/:genreId
func (h *MusicHandler) GenrePlaylists(c *gin.Context) {
	detail, err := h.service.GenrePlaylists(c.Request.Context(), c.Param("genreId"))
	if err != nil {
		respondBrowseError(c, err, "genre", "gagal mengambil playlist genre")
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil playlist genre", detail)
}

// GET /api/v1/music/playlists/:playlistId
func (h *MusicHandler) Playlist(c *gin.Context) {
	detail, err := h.service.Playlist(c.Request.Context(), c.Param("playlistId"))
	if err != nil {
		respondBrowseError(c, err, "playlist", "gagal mengambil isi playlist")
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil isi playlist", detail)
}

func respondBrowseError(c *gin.Context, err error, subject, fallback string) {
	switch {
	case errors.Is(err, service.ErrInvalidBrowseID):
		response.Error(c, http.StatusBadRequest, subject+" id tidak valid", nil)
	case errors.Is(err, service.ErrBrowseNotFound):
		response.Error(c, http.StatusNotFound, subject+" tidak ditemukan", nil)
	default:
		response.Error(c, http.StatusBadGateway, fallback, err.Error())
	}
}
