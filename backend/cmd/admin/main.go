// Command admin grants or revokes the admin role. It is the only way to make an
// admin: the API never lets a user change their own role.
//
//	go run ./cmd/admin -username alice          # jadikan admin
//	go run ./cmd/admin -username alice -revoke  # kembalikan ke user biasa
//
// Di luar APP_ENV=development wajib tambah -yes (cegah salah database).
package main

import (
	"flag"
	"fmt"
	"log"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/model"

	"gorm.io/gorm"
)

func main() {
	username := flag.String("username", "", "username yang role-nya diubah (wajib)")
	revoke := flag.Bool("revoke", false, "cabut role admin (jadi user biasa)")
	yes := flag.Bool("yes", false, "konfirmasi untuk database selain development")
	flag.Parse()
	if *username == "" {
		flag.Usage()
		log.Fatal("-username wajib diisi")
	}

	cfg := config.Load()
	log.Printf("target database: %s/%s (APP_ENV=%s)", cfg.DB.Host, cfg.DB.Name, cfg.AppEnv)
	if cfg.AppEnv != "development" && !*yes {
		log.Fatal("bukan database development: ulangi dengan -yes kalau memang benar")
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("gagal konek ke database: %v", err)
	}
	// Tidak menjalankan migration dari sini: kolom role harus sudah ada (jalankan backend dulu).
	if !db.Migrator().HasColumn(&model.User{}, "role") {
		log.Fatal("kolom users.role belum ada: jalankan backend sekali supaya migration 0005 diterapkan")
	}

	role := model.RoleAdmin
	if *revoke {
		role = model.RoleUser
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if *revoke {
			// Jangan sampai tidak ada admin sama sekali.
			var others int64
			if err := tx.Model(&model.User{}).Where("role = ? AND username <> ?", model.RoleAdmin, *username).Count(&others).Error; err != nil {
				return err
			}
			if others == 0 {
				return fmt.Errorf("%q adalah admin terakhir: jadikan user lain admin dulu", *username)
			}
		}
		res := tx.Model(&model.User{}).Where("username = ?", *username).Update("role", role)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("user %q tidak ditemukan", *username)
		}
		return nil
	})
	if err != nil {
		log.Fatalf("gagal mengubah role: %v", err)
	}
	log.Printf("role %q sekarang %s", *username, role)
}
