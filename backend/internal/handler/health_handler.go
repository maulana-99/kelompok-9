package handler

import (
	"backend/internal/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

func HealthCheck(c *gin.Context) {
	response.Success(c, http.StatusOK, "service is healthy", gin.H{
		"status": "ok",
	})
}
