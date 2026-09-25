package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/model"
	"backend/internal/router"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	if cfg.Port == "" {
		log.Fatal("fatal: PORT environment variable is required")
	}

	gin.SetMode(cfg.GinMode)

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("fatal: %v", err)
	}

	// Auto-migrate: tambahkan model baru di sini kalau bikin resource baru.
	if err := db.AutoMigrate(&model.User{}); err != nil {
		log.Fatalf("fatal: gagal migrate database: %v", err)
	}

	r := router.New(db)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	// Jalankan server di goroutine supaya tidak blocking, biar bisa handle graceful shutdown.
	go func() {
		log.Printf("server jalan di port %s (env: %s)\n", cfg.Port, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("fatal: gagal menjalankan server: %v", err)
		}
	}()

	// Tunggu sinyal interrupt/terminate untuk shutdown yang rapi.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("server shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("fatal: server dipaksa shutdown: %v", err)
	}

	log.Println("server berhenti dengan rapi")
}
