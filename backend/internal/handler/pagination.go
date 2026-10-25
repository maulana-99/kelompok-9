package handler

import (
	"net/http"
	"strconv"

	"backend/internal/response"

	"github.com/gin-gonic/gin"
)

// parsePageLimit reads ?page= and ?limit= with sensible defaults; limit above
// maxLimit is clamped, invalid values get 400. Returns ok=false after
// responding so handlers can return early.
func parsePageLimit(c *gin.Context, defaultLimit, maxLimit int) (page, limit int, ok bool) {
	page = 1
	if raw := c.Query("page"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			response.Error(c, http.StatusBadRequest, "parameter page harus angka positif", nil)
			return 0, 0, false
		}
		page = parsed
	}

	limit = defaultLimit
	if raw := c.Query("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			response.Error(c, http.StatusBadRequest, "parameter limit harus angka positif", nil)
			return 0, 0, false
		}
		limit = parsed
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return page, limit, true
}
