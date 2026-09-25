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

	v1 := r.Group("/api/v1")
	{
		users := v1.Group("/users")
		{
			users.POST("", userHandler.Create)
			users.GET("", userHandler.GetAll)
			users.GET("/:id", userHandler.GetByID)
			users.PUT("/:id", userHandler.Update)
			users.DELETE("/:id", userHandler.Delete)
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
