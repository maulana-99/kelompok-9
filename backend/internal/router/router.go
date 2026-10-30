package router

import (
	"backend/internal/config"
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func New(db *gorm.DB, cfg *config.Config) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())

	r.GET("/health", handler.HealthCheck)

	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)
	sessionRepo := repository.NewSessionRepository(db)
	jwtService := service.NewJWTService(cfg.JWT.Secret, cfg.JWT.ExpiresHours)
	authService := service.NewAuthService(userRepo, sessionRepo, jwtService)
	authHandler := handler.NewAuthHandler(authService)
	requireAuth := middleware.Auth(authService)
	optionalAuth := middleware.OptionalAuth(authService)

	playlistRepo := repository.NewPlaylistRepository(db)
	playlistSongRepo := repository.NewPlaylistSongRepository(db)
	playlistService := service.NewPlaylistService(playlistRepo, playlistSongRepo)
	playlistSongService := service.NewPlaylistSongService(playlistRepo, playlistSongRepo)
	playlistHandler := handler.NewPlaylistHandler(playlistService, authService)
	playlistSongHandler := handler.NewPlaylistSongHandler(playlistSongService, authService)

	likeRepo := repository.NewLikeRepository(db)
	likeService := service.NewLikeService(likeRepo)
	likeHandler := handler.NewLikeHandler(likeService)
	adminHandler := handler.NewAdminHandler(service.NewAdminService(repository.NewAdminRepository(db)))

	historyRepo := repository.NewHistoryRepository(db)
	historyHandler := handler.NewHistoryHandler(service.NewHistoryService(historyRepo))

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
			// optionalAuth: is_following diisi saat peminta membawa token valid.
			users.GET("/:id", optionalAuth, userHandler.GetByID)

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
		recommendationHandler := handler.NewRecommendationHandler(
			service.NewRecommendationService(historyRepo, playlistSongRepo, musicService),
		)

		music := v1.Group("/music")
		{
			music.GET("/search", musicHandler.Search)
			music.GET("/thumb", musicHandler.Thumb)
			music.GET("/info", musicHandler.Infos)
			music.GET("/genres", musicHandler.Genres)
			music.GET("/genres/:genreId", musicHandler.GenrePlaylists)
			music.GET("/playlists/:playlistId", musicHandler.Playlist)
			music.GET("/:musicId/stream", musicHandler.Stream)
			music.GET("/:musicId/radio", requireAuth, musicHandler.Radio)
			music.GET("/:musicId/mix", requireAuth, recommendationHandler.SongMix)
			music.GET("/:musicId/lyrics", requireAuth, musicHandler.Lyrics)
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

		// --- Like Songs (login required) ---
		likes := v1.Group("/likes")
		likes.Use(requireAuth)
		{
			likes.POST("", likeHandler.Create)
			likes.GET("", likeHandler.List)
			likes.DELETE("/:musicId", likeHandler.Delete)
		}

		// --- Listening history of the logged-in user (API design 8) ---
		history := v1.Group("/history", requireAuth)
		{
			history.POST("", historyHandler.Record)
			history.GET("", historyHandler.List)
			history.DELETE("", historyHandler.Clear)
		}

		// --- Admin (RBAC): read-only view of registered users ---
		admin := v1.Group("/admin", requireAuth, middleware.RequireRole(model.RoleAdmin))
		{
			admin.GET("/users", adminHandler.ListUsers)
			admin.GET("/stats", adminHandler.Stats)
		}

		// Personal mixes built from history + playlists (see recommendation_service.go)
		v1.GET("/recommendations", requireAuth, recommendationHandler.ForUser)

		// Add other resources here, e.g.:
		// products := v1.Group("/products")
		// {
		// 	products.GET("", productHandler.GetAll)
		// 	...
		// }
	}

	return r
}
