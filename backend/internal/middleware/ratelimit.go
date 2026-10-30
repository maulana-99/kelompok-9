package middleware

import (
	"backend/internal/response"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimit allows each client IP at most `limit` requests per `window`
// (fixed window) and answers 429 beyond that. Meant for cheap public
// endpoints that start expensive work, e.g. POST /music/:id/prepare.
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	type counter struct {
		start time.Time
		n     int
	}
	var (
		mu      sync.Mutex
		clients = map[string]*counter{}
		swept   = time.Now()
	)
	return func(c *gin.Context) {
		now := time.Now()
		ip := c.ClientIP()

		mu.Lock()
		// Drop finished windows now and then so the map cannot grow without bound.
		if now.Sub(swept) > window {
			for k, v := range clients {
				if now.Sub(v.start) > window {
					delete(clients, k)
				}
			}
			swept = now
		}
		cur, ok := clients[ip]
		if !ok || now.Sub(cur.start) > window {
			cur = &counter{start: now}
			clients[ip] = cur
		}
		cur.n++
		over := cur.n > limit
		mu.Unlock()

		if over {
			response.Error(c, http.StatusTooManyRequests, "terlalu banyak permintaan, coba lagi sebentar", nil)
			c.Abort()
			return
		}
		c.Next()
	}
}
