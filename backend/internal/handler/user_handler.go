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
		if errors.Is(err, service.ErrUsernameTaken) {
			response.Error(c, http.StatusConflict, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal membuat user", nil)
		return
	}

	response.Success(c, http.StatusCreated, "user berhasil dibuat", user)
}

// GET /api/v1/users?q=<nama atau username>
func (h *UserHandler) GetAll(c *gin.Context) {
	users, err := h.service.GetAllUsers(c.Query("q"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "gagal mengambil data user", nil)
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
			response.Error(c, http.StatusNotFound, "user tidak ditemukan", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal mengambil user", nil)
		return
	}

	response.Success(c, http.StatusOK, "berhasil mengambil user", user)
}

// PUT /api/v1/users/:id (auth, owner-only)
func (h *UserHandler) Update(c *gin.Context) {
	id, ok := ownerID(c)
	if !ok {
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
			response.Error(c, http.StatusNotFound, "user tidak ditemukan", nil)
			return
		}
		if errors.Is(err, service.ErrUsernameTaken) {
			response.Error(c, http.StatusConflict, err.Error(), nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal update user", nil)
		return
	}

	response.Success(c, http.StatusOK, "user berhasil diupdate", user)
}

// DELETE /api/v1/users/:id (auth, owner-only). Data turunan ikut terhapus lewat ON DELETE CASCADE.
func (h *UserHandler) Delete(c *gin.Context) {
	id, ok := ownerID(c)
	if !ok {
		return
	}

	if err := h.service.DeleteUser(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(c, http.StatusNotFound, "user tidak ditemukan", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "gagal hapus user", nil)
		return
	}

	response.Success(c, http.StatusOK, "user berhasil dihapus", nil)
}

// ownerID parses :id and makes sure it belongs to the logged-in user.
// It writes the error response itself, so the caller only needs to return.
func ownerID(c *gin.Context) (int, bool) {
	id, err := parseID(c)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "id tidak valid", nil)
		return 0, false
	}
	if c.GetInt("userID") != id {
		response.Error(c, http.StatusForbidden, "tidak boleh mengubah akun user lain", nil)
		return 0, false
	}
	return id, true
}

func parseID(c *gin.Context) (int, error) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		return 0, errors.New("invalid id")
	}
	return id, nil
}
