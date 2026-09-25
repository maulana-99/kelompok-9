package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS mengizinkan request dari origin lain. Untuk production, ganti "*"
// dengan daftar origin spesifik (bisa juga ditarik dari env kalau perlu).
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
