package middleware

import (
	"backend/internal/response"
	"backend/internal/service"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Auth validates the Bearer token and stores "userID" and "user" in the context.
// Invalid or missing tokens get 401.
func Auth(authService service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := authService.GetUserByToken(TokenFromHeader(c))
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "belum login", nil)
			c.Abort()
			return
		}

		c.Set("userID", user.ID)
		c.Set("user", user)
		c.Next()
	}
}

// TokenFromHeader returns the Bearer token, or "" if the header is missing or malformed.
func TokenFromHeader(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if len(header) < 8 || !strings.EqualFold(header[:7], "Bearer ") {
		return ""
	}
	return strings.TrimSpace(header[7:])
}
