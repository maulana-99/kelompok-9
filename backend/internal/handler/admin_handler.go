package handler

import (
	"backend/internal/response"
	"backend/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	admin service.AdminService
}

func NewAdminHandler(admin service.AdminService) *AdminHandler {
	return &AdminHandler{admin: admin}
}

// GET /api/v1/admin/users?q=&page=&limit= (admin) — registered users, newest first
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, err := optionalPositiveInt(c.Query("page"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "page tidak valid", nil)
		return
	}
	limit, err := optionalPositiveInt(c.Query("limit"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "limit tidak valid", nil)
		return
	}

	list, err := h.admin.ListUsers(c.Query("q"), page, limit)
	if err != nil {
		log.Printf("admin list users: %v", err)
		response.Error(c, http.StatusInternalServerError, "gagal mengambil daftar user", nil)
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil daftar user", list)
}

// GET /api/v1/admin/stats (admin)
func (h *AdminHandler) Stats(c *gin.Context) {
	stats, err := h.admin.Stats()
	if err != nil {
		log.Printf("admin stats: %v", err)
		response.Error(c, http.StatusInternalServerError, "gagal mengambil statistik", nil)
		return
	}
	response.Success(c, http.StatusOK, "berhasil mengambil statistik", stats)
}

// optionalPositiveInt parses a query value; "" means 0 (use the default).
func optionalPositiveInt(raw string) (int, error) {
	if raw == "" {
		return 0, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return 0, strconv.ErrSyntax
	}
	return n, nil
}
