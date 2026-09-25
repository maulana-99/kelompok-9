package handler

import (
	"backend/internal/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthCheck dipakai load balancer / monitoring untuk cek apakah service hidup.
func HealthCheck(c *gin.Context) {
	response.Success(c, http.StatusOK, "service is healthy", gin.H{
		"status": "ok",
	})
}
