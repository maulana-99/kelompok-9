package middleware

import (
	"backend/internal/model"
	"backend/internal/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireRole must run after Auth. The role comes from the user Auth just loaded
// from the database, so a demoted admin loses access on the next request.
// Logged-in users without the role get 403.
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		value, _ := c.Get("user")
		user, ok := value.(*model.User)
		if !ok || user == nil {
			response.Error(c, http.StatusUnauthorized, "belum login", nil)
			c.Abort()
			return
		}
		if user.Role != role {
			response.Error(c, http.StatusForbidden, "tidak punya akses", nil)
			c.Abort()
			return
		}
		c.Next()
	}
}
