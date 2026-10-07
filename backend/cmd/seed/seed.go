package main

import (
	"log"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/model"
)

func main() {
	// 1. Load config & koneksi ke database (samakan dengan main.go)
	cfg := config.Load()
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Gagal konek ke database: %v", err)
	}

	// 2. Buat data User Dummy
	users := []model.User{
		{ID: 1, Name: "Alice", Username: "alice", Password: "password123"},
		{ID: 2, Name: "Bob", Username: "bob", Password: "password123"},
	}

	for _, u := range users {
		db.FirstOrCreate(&u, model.User{ID: u.ID})
	}

	// 3. Buat relasi Follow (User 1 follow User 2)
	db.Exec("INSERT INTO follow (follower_id, following_id) VALUES (?, ?) ON CONFLICT DO NOTHING", 1, 2)

	log.Println("Berhasil memasukkan data dummy!")
}