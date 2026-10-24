package middleware

import (
	"backend/internal/model"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func runRequireRole(t *testing.T, user any) int {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/", func(c *gin.Context) {
		if user != nil {
			c.Set("user", user)
		}
		c.Next()
	}, RequireRole(model.RoleAdmin), func(c *gin.Context) { c.Status(http.StatusOK) })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	return w.Code
}

func TestRequireRole(t *testing.T) {
	cases := []struct {
		name string
		user any
		want int
	}{
		{"admin passes", &model.User{ID: 1, Role: model.RoleAdmin}, http.StatusOK},
		{"normal user forbidden", &model.User{ID: 2, Role: model.RoleUser}, http.StatusForbidden},
		{"empty role forbidden", &model.User{ID: 3}, http.StatusForbidden},
		{"no user unauthorized", nil, http.StatusUnauthorized},
		{"wrong type unauthorized", "admin", http.StatusUnauthorized},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := runRequireRole(t, tc.user); got != tc.want {
				t.Fatalf("got %d, want %d", got, tc.want)
			}
		})
	}
}
