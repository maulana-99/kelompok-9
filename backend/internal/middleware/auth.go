package middleware

import (
	"backend/internal/response"
	"backend/internal/service"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Auth will verify "Authorization: Bearer <token>" token through AuthService.
// when (yh) valid, the userID and user stored to the context so handler dont need to query db again
// when invalid, request cacelled and returns 401 error.
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

// TokenFromHeader parse the "Authorization: Bearer <token>" header, returns empty string if the header missing or format was incorrect
func TokenFromHeader(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if len(header) < 8 || !strings.EqualFold(header[:7], "Bearer ") {
		return ""
	}
	return strings.TrimSpace(header[7:])
}
