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

	playlistRepo := repository.NewPlaylistRepository(db)
	playlistSongRepo := repository.NewPlaylistSongRepository(db)
	playlistService := service.NewPlaylistService(playlistRepo, playlistSongRepo)
	playlistSongService := service.NewPlaylistSongService(playlistRepo, playlistSongRepo)
	playlistHandler := handler.NewPlaylistHandler(playlistService, authService)
	playlistSongHandler := handler.NewPlaylistSongHandler(playlistSongService, authService)

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

			// Extra followers & following endpoints
			users.GET("/:id/followers", userHandler.GetFollowers)
			users.GET("/:id/following", userHandler.GetFollowing)

			// Follow & unfollow endpoints (login required)
			users.POST("/:id/follow", requireAuth, userHandler.Follow)
			users.DELETE("/:id/follow", requireAuth, userHandler.Unfollow)

			// requireAuth for update and delete
			users.PUT("/:id", requireAuth, userHandler.Update)
			users.DELETE("/:id", requireAuth, userHandler.Delete)
		}

		// --- Music (YouTube Music scraping, no local tables) ---
		musicService := service.NewMusicService()
		musicHandler := handler.NewMusicHandler(musicService)

		music := v1.Group("/music")
		{
			music.GET("/search", musicHandler.Search)
			music.GET("/thumb", musicHandler.Thumb)
			music.GET("/info", musicHandler.Infos)
			music.GET("/genres", musicHandler.Genres)
			music.GET("/genres/:genreId", musicHandler.GenrePlaylists)
			music.GET("/playlists/:playlistId", musicHandler.Playlist)
			music.GET("/:musicId/stream", musicHandler.Stream)
		}

		// --- Playlists & songs inside playlists (API design 5 & 6) ---
		playlists := v1.Group("/playlists")
		{
			playlists.POST("", requireAuth, playlistHandler.Create)
			playlists.GET("", playlistHandler.List)
			playlists.GET("/:id", playlistHandler.GetByID)
			playlists.PUT("/:id", requireAuth, playlistHandler.Update)
			playlists.DELETE("/:id", requireAuth, playlistHandler.Delete)

			playlists.GET("/:id/songs", playlistSongHandler.List)
			playlists.POST("/:id/songs", requireAuth, playlistSongHandler.Add)
			playlists.DELETE("/:id/songs/:songId", requireAuth, playlistSongHandler.Delete)
		}

		// Add other resources here, e.g.:
		// products := v1.Group("/products")
		// {
		// 	products.GET("", productHandler.GetAll)
		// 	...
		// }
	}

	return r
}