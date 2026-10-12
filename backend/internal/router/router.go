package router

import (
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func New(db *gorm.DB) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())

	r.GET("/health", handler.HealthCheck)

	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)
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
			auth.GET("/me", requireAuth, authHandler.Me)
		}

		users := v1.Group("/users")
		{
			users.POST("", userHandler.Create)
			users.GET("", userHandler.GetAll)
			users.GET("/:id", userHandler.GetByID)
			users.GET("/:id/followers", userHandler.GetFollowers)
			users.GET("/:id/following", userHandler.GetFollowing)
			users.POST("/:id/follow", requireAuth, userHandler.Follow)
			users.DELETE("/:id/follow", requireAuth, userHandler.Unfollow)
			users.PUT("/:id", requireAuth, userHandler.Update)
			users.DELETE("/:id", requireAuth, userHandler.Delete)
		}

		musicService := service.NewMusicService()
		musicHandler := handler.NewMusicHandler(musicService)
		music := v1.Group("/music")
		{
			music.GET("/search", musicHandler.Search)
			music.GET("/thumb", musicHandler.Thumb)
			music.GET("/:musicId/stream", musicHandler.Stream)
		}

		playlistService := service.NewPlaylistService(repository.NewPlaylistRepository(db))
		playlistHandler := handler.NewPlaylistHandler(playlistService)
		playlists := v1.Group("/playlists", requireAuth)
		{
			playlists.GET("", playlistHandler.List)
			playlists.GET("/:id", playlistHandler.Get)
			playlists.POST("", playlistHandler.Create)
		}
	}

	return r
}