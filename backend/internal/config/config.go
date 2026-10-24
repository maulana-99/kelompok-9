package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	Port    string
	GinMode string

	DB  DBConfig
	JWT JWTConfig
}

type JWTConfig struct {
	Secret       string
	ExpiresHours int
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	TimeZone string
}

func Load() *Config {
	// .env opsional: di production (Render) env diisi dari dashboard.
	if err := godotenv.Load(); err != nil {
		log.Println(".env tidak ditemukan, pakai environment variable sistem")
	}

	secret := getEnv("JWT_SECRET", "")
	if secret == "" {
		if getEnv("APP_ENV", "development") == "production" {
			log.Fatal("fatal: JWT_SECRET environment variable is required")
		}
		log.Println("JWT_SECRET tidak diatur, pakai default development (jangan dipakai di production)")
		secret = "dev-jwt-secret-kelompok9"
	}

	expiresHours := 24
	if v := getEnv("JWT_EXPIRES_HOURS", ""); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			expiresHours = n
		} else {
			log.Printf("JWT_EXPIRES_HOURS tidak valid (%s), pakai default 24 jam", v)
		}
	}

	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		Port:    getEnv("PORT", ""),
		GinMode: getEnv("GIN_MODE", "debug"),
		DB: DBConfig{
			Host:     getEnv("DB_HOST", ""),
			Port:     getEnv("DB_PORT", ""),
			User:     getEnv("DB_USER", ""),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", ""),
			SSLMode:  getEnv("DB_SSLMODE", ""),
			TimeZone: getEnv("DB_TIMEZONE", ""),
		},
		JWT: JWTConfig{
			Secret:       secret,
			ExpiresHours: expiresHours,
		},
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if value, success := os.LookupEnv(key); success && value != "" {
		return value
	}
	return fallback
}
