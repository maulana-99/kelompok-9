package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger mencatat method, path, status, dan durasi tiap request.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		duration := time.Since(start)
		log.Printf("[%s] %s %s -> %d (%s)",
			c.Request.Method,
			path,
			c.ClientIP(),
			c.Writer.Status(),
			duration,
		)
	}
}
