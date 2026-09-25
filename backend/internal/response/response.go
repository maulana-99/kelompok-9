package response

import (
	"github.com/gin-gonic/gin"
)

type successRes struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

type errorRes struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Errors  any    `json:"errors,omitempty"`
}

func Success(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, successRes{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func Error(c *gin.Context, statusCode int, message string, errs any) {
	c.JSON(statusCode, errorRes{
		Success: false,
		Message: message,
		Errors:  errs,
	})
}
