package database

import (
	"fmt"

	"gorm.io/gorm"
)

// reconcileLegacySchema menyelaraskan tabel `users` versi lama (dibuat GORM AutoMigrate)
// ke bentuk ERD sebelum migration 0001 dijalankan.
//
// Yang disamakan:
//   - tambah kolom `username` (di-backfill dari email / id kalau ada datanya)
//   - hapus kolom `email` dan `updated_at` (tidak ada di ERD)
//   - ubah tipe `id` bigint -> integer supaya tipe FK di tabel lain cocok
//
// Aman dipanggil di database kosong (langsung no-op) dan berkali-kali (idempotent).
func reconcileLegacySchema(db *gorm.DB) error {
	var exists bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'users'
		)
	`).Scan(&exists).Error; err != nil {
		return fmt.Errorf("gagal cek keberadaan tabel users: %w", err)
	}
	if !exists {
		return nil
	}

	hasUsername, err := columnExists(db, "users", "username")
	if err != nil {
		return err
	}
	hasEmail, err := columnExists(db, "users", "email")
	if err != nil {
		return err
	}

	if !hasUsername {
		if err := db.Exec(`ALTER TABLE users ADD COLUMN username VARCHAR(50)`).Error; err != nil {
			return fmt.Errorf("gagal menambah kolom username: %w", err)
		}

		// Backfill: pakai bagian depan email, kalau tidak ada pakai "user_<id>".
		var backfill string
		if hasEmail {
			backfill = `UPDATE users
				SET username = COALESCE(NULLIF(split_part(email, '@', 1), ''), 'user_' || id)
				WHERE username IS NULL`
		} else {
			backfill = `UPDATE users SET username = 'user_' || id WHERE username IS NULL`
		}
		if err := db.Exec(backfill).Error; err != nil {
			return fmt.Errorf("gagal backfill username: %w", err)
		}

		// Rapikan duplikat supaya unique index di bawah bisa dibuat.
		if err := db.Exec(`
			UPDATE users u
			SET username = u.username || '_' || u.id
			FROM (
				SELECT id, ROW_NUMBER() OVER (PARTITION BY username ORDER BY id) AS rn
				FROM users
			) d
			WHERE u.id = d.id AND d.rn > 1
		`).Error; err != nil {
			return fmt.Errorf("gagal deduplikasi username: %w", err)
		}
	}

	if err := db.Exec(`ALTER TABLE users ALTER COLUMN username SET NOT NULL`).Error; err != nil {
		return fmt.Errorf("gagal set NOT NULL username: %w", err)
	}
	if err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username)`).Error; err != nil {
		return fmt.Errorf("gagal membuat unique index username: %w", err)
	}

	// `email` dan `updated_at` tidak ada di ERD (nama di ERD hanya `created_at`).
	if hasEmail {
		if err := db.Exec(`ALTER TABLE users DROP COLUMN email`).Error; err != nil {
			return fmt.Errorf("gagal menghapus kolom email: %w", err)
		}
	}
	for _, col := range []string{"updated_at"} {
		has, err := columnExists(db, "users", col)
		if err != nil {
			return err
		}
		if has {
			if err := db.Exec(`ALTER TABLE users DROP COLUMN ` + col).Error; err != nil {
				return fmt.Errorf("gagal menghapus kolom %s: %w", col, err)
			}
		}
	}

	// Legacy: id bertipe bigint (GORM default), sedangkan ERD pakai integer.
	// Tanpa ini, FK integer -> bigint ditolak Postgres. Cek dulu apakah nilainya muat.
	var idType string
	if err := db.Raw(`
		SELECT data_type FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
	`).Scan(&idType).Error; err != nil {
		return fmt.Errorf("gagal cek tipe kolom users.id: %w", err)
	}
	if idType == "bigint" {
		var tooBig int64
		if err := db.Raw(`SELECT COUNT(*) FROM users WHERE id > 2147483647`).Scan(&tooBig).Error; err != nil {
			return fmt.Errorf("gagal cek nilai id: %w", err)
		}
		if tooBig > 0 {
			return fmt.Errorf("kolom users.id bertipe bigint dengan %d baris bernilai > 2147483647; "+
				"perlu keputusan manual sebelum konversi ke integer", tooBig)
		}
		if err := db.Exec(`ALTER TABLE users ALTER COLUMN id TYPE INTEGER`).Error; err != nil {
			return fmt.Errorf("gagal konversi users.id ke integer: %w", err)
		}
	}

	// created_at di ERD punya default, biar insert tanpa nilai tetap jalan.
	if err := db.Exec(`ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW()`).Error; err != nil {
		return fmt.Errorf("gagal set default created_at: %w", err)
	}

	return nil
}

func columnExists(db *gorm.DB, table, column string) (bool, error) {
	var exists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
		)
	`, table, column).Scan(&exists).Error
	if err != nil {
		return false, fmt.Errorf("gagal cek kolom %s.%s: %w", table, column, err)
	}
	return exists, nil
}
