// Package router adalah satu-satunya tempat yang tahu "path apa memanggil handler apa".
// Kalau mau nambah resource baru (mis. "product"), pola yang diikuti selalu sama:
//  1. Buat model di internal/model
//  2. Buat repository di internal/repository
//  3. Buat service di internal/service
//  4. Buat handler di internal/handler
//  5. Daftarkan route-nya di sini, di dalam group v1
package router

import (
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// New merakit seluruh dependency (repository -> service -> handler) lalu
// mendaftarkan semua route ke gin.Engine yang dikembalikan.
func New(db *gorm.DB) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())

	// health check di root, di luar versioning
	r.GET("/health", handler.HealthCheck)

	// --- wiring dependency untuk resource "user" ---
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)

	// --- wiring dependency untuk resource "auth" ---
	sessionRepo := repository.NewSessionRepository(db)
	authService := service.NewAuthService(userRepo, sessionRepo)
	authHandler := handler.NewAuthHandler(authService)
	requireAuth := middleware.Auth(authService)

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)

			// /me valid token needed, so Auth middleware applied to it
			auth.GET("/me", requireAuth, authHandler.Me)
		}

		users := v1.Group("/users")
		{
			users.POST("", userHandler.Create)
			users.GET("", userHandler.GetAll)
			users.GET("/:id", userHandler.GetByID)
			users.PUT("/:id", userHandler.Update)
			users.DELETE("/:id", userHandler.Delete)
		}

		// --- Wiring dependency for the music resource (scraping YouTube Music and no local tables) ---
		musicService := service.NewMusicService()
		musicHandler := handler.NewMusicHandler(musicService)

		music := v1.Group("/music")
		{
			music.GET("/search", musicHandler.Search)
			music.GET("/thumb", musicHandler.Thumb)
			music.GET("/:musicId/stream", musicHandler.Stream)
		}

		// Tambahkan resource lain di sini, contoh:
		// products := v1.Group("/products")
		// {
		// 	products.GET("", productHandler.GetAll)
		// 	...
		// }
	}

	return r
}
