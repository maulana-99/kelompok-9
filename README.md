# Melodi Music — Kelompok 9 WAD

Melodi adalah aplikasi web streaming musik. Pengguna bisa mencari dan memutar lagu, menjelajahi playlist berdasarkan mood dan genre, menyimpan lagu favorit, membuat playlist, serta mengikuti (follow) pengguna lain.

Project terdiri dari dua bagian yang terpisah:

| Bagian | Teknologi | Folder |
|---|---|---|
| Backend (REST API) | Go 1.27, Gin, GORM, PostgreSQL | `backend/` |
| Frontend (SPA) | React 19, TypeScript, Vite 8, Tailwind CSS 3 | `frontend/` |
| Sumber musik | YouTube Music (API internal) + yt-dlp | — |

## Gambaran Project

**Arsitektur backend** berlapis: `handler` (menerima request) → `service` (logika) → `repository` (query database). Respons API selalu berformat `{ success, message, data }`.

**Data musik** tidak disimpan di database. Pencarian, kategori, dan playlist diambil langsung dari YouTube Music, sedangkan audio diputar lewat `yt-dlp`. Database hanya menyimpan data milik pengguna (akun, sesi login, follow, playlist, riwayat dengar).

**Pengelompokan genre.** YouTube Music tidak menyediakan genre per lagu. Karena itu musik dikelompokkan memakai kategori bawaan YouTube Music (11 mood dan 27 genre). Setiap kategori berisi playlist kurasi, dan setiap playlist berisi daftar lagu.

## Cara Menjalankan (untuk Anggota Kelompok)

### 1. Pasang tools

| Tool | Versi | Cek |
|---|---|---|
| Go | ≥ 1.27 | `go version` |
| Node.js | ≥ 20.19 | `node -v` |
| PostgreSQL | ≥ 13 | `psql --version` |
| yt-dlp | terbaru | `yt-dlp --version` |

- **Windows:** `winget install GoLang.Go`, `winget install OpenJS.NodeJS.LTS`, `winget install yt-dlp.yt-dlp`, lalu pasang PostgreSQL dari [postgresql.org](https://www.postgresql.org/download/windows/).
- **macOS:** `brew install go node postgresql@18 yt-dlp`
- **Linux:** pasang lewat package manager masing-masing (contoh Arch: `sudo pacman -S go nodejs npm postgresql yt-dlp`).

### 2. Siapkan database

Pilih salah satu:

- **Database bersama (cloud).** Minta isi file `backend/.env` ke ketua kelompok. Kredensial tidak disimpan di repo.
- **Database lokal.** Masuk ke `psql` sebagai superuser, lalu jalankan:

  ```sql
  CREATE USER kelompok9 WITH PASSWORD 'kelompok9';
  CREATE DATABASE kelompok9 OWNER kelompok9;
  ```

Tabel tidak perlu dibuat manual. Backend menjalankan migration otomatis saat start.

### 3. Jalankan backend

```bash
cd backend
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
go run ./cmd/api          # http://localhost:8080
```

Cek: buka <http://localhost:8080/health>, hasilnya harus `"success": true`.

### 4. Jalankan frontend (terminal kedua)

```bash
cd frontend
cp .env.example .env      # berisi VITE_API_URL=http://localhost:8080/api/v1
npm install
npm run dev               # http://localhost:5173
```

Buka <http://localhost:5173>, lalu daftar akun baru di halaman Sign Up.

### 5. Sebelum push

```bash
cd frontend && npm run build && npm run lint && cd ..
cd backend && go vet ./... && go build ./... && cd ..
```

Buat branch baru untuk setiap fitur (`feat/nama-fitur`), lalu ajukan Pull Request ke `main`.

## Masalah Umum

| Masalah | Solusi |
|---|---|
| `Error loading .env file` | Jalankan backend dari folder `backend/` dan pastikan `.env` sudah dibuat |
| `failed to connect to database` | PostgreSQL belum jalan atau isi `.env` salah |
| Lagu tidak bisa diputar | yt-dlp belum terpasang atau versinya lama: update dengan `yt-dlp -U` |
| Frontend `Tidak bisa terhubung ke server` | Backend belum jalan, atau `VITE_API_URL` salah. Restart `npm run dev` setelah mengubah `.env` |
| `address already in use` | Port 8080 dipakai program lain. Ganti `PORT` di `backend/.env` dan sesuaikan `VITE_API_URL` |
