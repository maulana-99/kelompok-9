package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	Port    string
	GinMode string

	DB DBConfig
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
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if value, success := os.LookupEnv(key); success && value != "" {
		return value
	}
	return fallback
}
