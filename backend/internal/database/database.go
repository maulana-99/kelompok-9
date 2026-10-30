package database

import (
	"backend/internal/config"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		cfg.DB.Host,
		cfg.DB.Port,
		cfg.DB.User,
		cfg.DB.Password,
		cfg.DB.Name,
		cfg.DB.SSLMode,
		cfg.DB.TimeZone,
	)

	logLevel := gormLogger.Silent
	if cfg.AppEnv == "development" {
		logLevel = gormLogger.Info
	}

	// Simple protocol: no server-side prepared statements. The DSN goes through
	// Neon's PgBouncer pooler, which shares prepared statements between clients;
	// after a migration alters a table (e.g. users.role) those cached plans fail
	// with "cached plan must not change result type".
	db, err := gorm.Open(postgres.New(postgres.Config{DSN: dsn, PreferSimpleProtocol: true}), &gorm.Config{
		Logger: gormLogger.Default.LogMode(logLevel),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	log.Printf("database terkoneksi ke %s:%s/%s\n", cfg.DB.Host, cfg.DB.Port, cfg.DB.Name)

	return db, err
}
