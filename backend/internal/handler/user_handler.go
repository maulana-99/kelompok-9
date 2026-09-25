package handler

import (
	"backend/internal/model"
	"backend/internal/response"
	"backend/internal/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserHandler hanya bertugas: parse request -> panggil service -> format response.
// Tidak ada business logic atau query DB di sini.
type UserHandler struct {
	service service.UserService
}

func NewUserHandler(s service.UserService) *UserHandler {
	return &UserHandler{service: s}
}

// POST /api/v1/users
func (h *UserHandler) Create(c *gin.Context) {
	var req model.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}

	user, err := h.service.CreateUser(req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal membuat user", err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "user berhasil dibuat", user)
}

// GET /api/v1/users
func (h *UserHandler) GetAll(c *gin.Context) {
	users, err := h.service.GetAllUsers()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mengambil data user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil data user", users)
}

// GET /api/v1/users/:id
func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	user, err := h.service.GetUserByID(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal mengambil user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil user", user)
}

// PUT /api/v1/users/:id
func (h *UserHandler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "payload tidak valid", err.Error())
		return
	}

	user, err := h.service.UpdateUser(id, req)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal update user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "user berhasil diupdate", user)
}

// DELETE /api/v1/users/:id
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return
	}

	if err := h.service.DeleteUser(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(c, http.StatusNotFound, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal hapus user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "user berhasil dihapus", nil)
}

func parseID(c *gin.Context) (uint, error) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}
