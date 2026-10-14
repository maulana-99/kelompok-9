package main

import (
	"log"

	"golang.org/x/crypto/bcrypt"

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

	// 2. Buat data User Dummy (password di-hash bcrypt, sama seperti register)
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal hash password: %v", err)
	}

	users := []model.User{
		{Name: "Alice", Username: "alice"},
		{Name: "Bob", Username: "bob"},
	}

	// ID tidak di-hardcode supaya sequence SERIAL tetap sinkron.
	// Assign memperbarui password lama yang masih plaintext.
	for i := range users {
		err := db.Where(model.User{Username: users[i].Username}).
			Assign(model.User{Name: users[i].Name, Password: string(hash)}).
			FirstOrCreate(&users[i]).Error
		if err != nil {
			log.Fatalf("Gagal seed user %s: %v", users[i].Username, err)
		}
	}

	// 3. Buat relasi Follow (Alice follow Bob)
	err = db.Exec(
		"INSERT INTO follow (follower_id, following_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
		users[0].ID, users[1].ID,
	).Error
	if err != nil {
		log.Fatalf("Gagal seed follow: %v", err)
	}

	log.Println("Berhasil memasukkan data dummy!")
}
