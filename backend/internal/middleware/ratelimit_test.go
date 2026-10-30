package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/x", RateLimit(2, time.Minute), func(c *gin.Context) { c.Status(http.StatusAccepted) })

	call := func(ip string) int {
		req := httptest.NewRequest(http.MethodPost, "/x", nil)
		req.RemoteAddr = ip + ":1234"
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w.Code
	}

	for i, want := range []int{http.StatusAccepted, http.StatusAccepted, http.StatusTooManyRequests} {
		if got := call("10.0.0.1"); got != want {
			t.Fatalf("call %d from same IP: got %d, want %d", i+1, got, want)
		}
	}
	if got := call("10.0.0.2"); got != http.StatusAccepted {
		t.Fatalf("other IP: got %d, want %d", got, http.StatusAccepted)
	}
}
