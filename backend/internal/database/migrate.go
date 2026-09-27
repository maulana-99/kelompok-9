package database

import (
	"backend/migrations"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"

	"gorm.io/gorm"
)

// Migration merepresentasikan satu file SQL di folder migrations/.
type Migration struct {
	Version string // contoh: "0001_init_schema"
	Path    string // nama file di dalam embed FS
}

// Migrate menjalankan semua migration .up.sql yang belum pernah diterapkan.
// Versi yang sudah diterapkan dicatat di tabel schema_migrations, jadi fungsi ini
// aman dipanggil berkali-kali (idempotent).
func Migrate(db *gorm.DB) error {
	if err := reconcileLegacySchema(db); err != nil {
		return fmt.Errorf("rekonsiliasi skema lama gagal: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP    NOT NULL DEFAULT NOW()
		)
	`).Error; err != nil {
		return fmt.Errorf("gagal membuat tabel schema_migrations: %w", err)
	}

	list, err := upMigrations()
	if err != nil {
		return err
	}

	for _, m := range list {
		var applied int64
		if err := db.Table("schema_migrations").Where("version = ?", m.Version).Count(&applied).Error; err != nil {
			return fmt.Errorf("gagal cek status migration %s: %w", m.Version, err)
		}
		if applied > 0 {
			continue
		}

		script, err := fs.ReadFile(migrations.FS, m.Path)
		if err != nil {
			return fmt.Errorf("gagal baca file migration %s: %w", m.Path, err)
		}

		log.Printf("migrate: menerapkan %s", m.Version)
		// Satu migration = satu transaksi. Kalau ada statement gagal, semuanya dibatalkan.
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(script)).Error; err != nil {
				return fmt.Errorf("eksekusi %s gagal: %w", m.Path, err)
			}
			return tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", m.Version).Error
		}); err != nil {
			return err
		}
	}

	log.Println("migrate: skema database up-to-date")
	return nil
}

// upMigrations mengumpulkan file *.up.sql, diurutkan berdasarkan nomor versi.
func upMigrations() ([]Migration, error) {
	entries, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		return nil, fmt.Errorf("gagal membaca folder migrations: %w", err)
	}

	var list []Migration
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".up.sql") {
			continue
		}
		list = append(list, Migration{
			Version: strings.TrimSuffix(e.Name(), ".up.sql"),
			Path:    e.Name(),
		})
	}

	sort.Slice(list, func(i, j int) bool { return list[i].Version < list[j].Version })
	return list, nil
}
