# Kelompok 9 — Melodi Music

Aplikasi musik (playlist, follow, riwayat dengar) dengan backend REST API dan frontend React.

| Bagian | Stack |
|---|---|
| Backend | Go 1.27 + Gin + GORM |
| Database | PostgreSQL 18 |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |

---

## 1. Struktur Project

```
kelompok-9/
├── backend/
│   ├── cmd/api/main.go              # entry point: load config -> connect DB -> migrate -> serve
│   ├── migrations/                  # file SQL migration (.up.sql / .down.sql), di-embed ke binary
│   ├── internal/
│   │   ├── config/                  # baca .env
│   │   ├── database/                # koneksi, runner migration, rekonsiliasi skema
│   │   ├── model/                   # struct GORM + request/response DTO
│   │   ├── repository/              # query database
│   │   ├── service/                 # business logic
│   │   ├── handler/                 # HTTP handler (parse request -> service -> response)
│   │   ├── middleware/              # logger, CORS
│   │   ├── router/                  # daftar semua route
│   │   └── response/                # format response JSON seragam
│   └── .env                         # konfigurasi lokal (tidak di-commit)
└── frontend/
    └── src/
        ├── pages/                   # halaman
        ├── components/              # komponen reusable
        ├── layouts/ hooks/ services/ utils/   # (masih kosong, siap dipakai)
        └── App.tsx
```

---

## 2. Prasyarat

```bash
go version        # minimal 1.27
node -v           # minimal 20 (dites di v22)
npm -v
psql --version    # PostgreSQL 18 (minimal 13)
```

Pastikan service PostgreSQL jalan:

```bash
sudo systemctl start postgresql
pg_isready -h localhost -p 5432     # harus: accepting connections
```

---

## 3. Setup Database

Buat user dan database (sekali saja). Ganti password kalau perlu.

```bash
sudo -u postgres psql <<'SQL'
CREATE USER kelompok9 WITH PASSWORD 'kelompok9';
CREATE DATABASE kelompok9 OWNER kelompok9;
GRANT ALL PRIVILEGES ON DATABASE kelompok9 TO kelompok9;
SQL
```

> Tabel **tidak perlu dibuat manual**. Aplikasi menjalankan migration otomatis saat start.

---

## 4. Setup Backend

```bash
cd backend
cp .env.example .env      # lalu sesuaikan isinya
go mod download
```

Isi `.env`:

```env
APP_ENV=development
PORT=8080
GIN_MODE=debug

DB_HOST=localhost
DB_PORT=5432
DB_USER=kelompok9
DB_PASSWORD=kelompok9
DB_NAME=kelompok9
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta
```

Jalankan:

```bash
go run ./cmd/api
```

Output yang diharapkan:

```
database terkoneksi ke localhost:5432/kelompok9
migrate: menerapkan 0001_init_schema
migrate: skema database up-to-date
server jalan di port 8080 (env: development)
```

Cek cepat: `curl localhost:8080/health` → `{"success":true,...}`

Build binary produksi:

```bash
go build -o bin/api ./cmd/api
./bin/api
```

---

## 5. Setup Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run dev` | dev server + hot reload |
| `npm run build` | build produksi ke `dist/` |
| `npm run preview` | preview hasil build |
| `npm run lint` | jalankan oxlint |

---

## 6. Menjalankan Semua (Development)

Butuh **2 terminal**:

```bash
# Terminal 1 — backend
cd backend && go run ./cmd/api        # http://localhost:8080

# Terminal 2 — frontend
cd frontend && npm run dev            # http://localhost:5173
```

Backend sudah mengizinkan CORS dari origin mana pun, jadi frontend bisa langsung memanggil `http://localhost:8080/api/v1/...`.

### Verifikasi cepat

```bash
# 1. backend hidup
curl localhost:8080/health

# 2. migration terpasang (harus ada 6 tabel + schema_migrations)
PGPASSWORD=kelompok9 psql -h localhost -U kelompok9 -d kelompok9 -c '\dt'

# 3. endpoint user jalan
curl -X POST localhost:8080/api/v1/users -H 'Content-Type: application/json' \
  -d '{"name":"Budi Santoso","username":"budi","password":"rahasia123"}'

# 4. frontend jalan
curl -o /dev/null -w '%{http_code}\n' http://localhost:5173/    # harap 200
```

Build produksi (wajib lulus sebelum push):

```bash
cd backend  && go build ./... && go vet ./...
cd frontend && npm run build
```

---

## 7. Migration Database

Migration memakai file SQL di `backend/migrations/`, dijalankan otomatis saat aplikasi start. Versi yang sudah diterapkan dicatat di tabel `schema_migrations`, jadi aman dijalankan berulang.

**Membuat migration baru:**

```
backend/migrations/0002_nama_perubahan.up.sql     # perubahan
backend/migrations/0002_nama_perubahan.down.sql   # rollback
```

- Nama file wajib `000X_*.up.sql` — nomor menentukan urutan eksekusi.
- Satu migration dijalankan dalam satu transaksi: kalau ada statement gagal, semuanya dibatalkan.
- Setelah file dibuat, cukup restart server.

**Rollback manual** (tidak otomatis):

```bash
PGPASSWORD=kelompok9 psql -h localhost -U kelompok9 -d kelompok9 \
  -f migrations/0002_nama_perubahan.down.sql
PGPASSWORD=kelompok9 psql -h localhost -U kelompok9 -d kelompok9 \
  -c "DELETE FROM schema_migrations WHERE version = '0002_nama_perubahan'"
```

**Lihat isi database:**

```bash
PGPASSWORD=kelompok9 psql -h localhost -U kelompok9 -d kelompok9 -c '\dt'
PGPASSWORD=kelompok9 psql -h localhost -U kelompok9 -d kelompok9 -c '\d playlist'
```

---

## 8. Skema Database

```
users(id, name, username UNIQUE, password, created_at)
  │
  ├── follow(id, following_id NN, follower_id NN)              UNIQUE(following_id, follower_id), tidak boleh follow diri sendiri
  ├── user_listening_history(id, user_id NN, music_id, last_played)
  ├── playlist(id, title, description, user_id NN, status, created_at)
  │     └── playlist_song(id, playlist_id NN, music_id, status, created_at)   UNIQUE(playlist_id, music_id)
  └── session(id, user_id NN, status, created_at)
```

Aturan yang berlaku:

- `NN` = `NOT NULL`. Semuanya kolom foreign key.
- Semua foreign key `ON DELETE CASCADE` — hapus user otomatis menghapus data turunannya.
- `music_id` bertipe `varchar`: merujuk ke layanan musik eksternal, bukan tabel lokal.
- Password disimpan dalam bentuk hash bcrypt, **tidak pernah plaintext**.

---

## 9. API Reference

Base URL: `http://localhost:8080`

Semua response memakai format seragam:

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "message": "…", "errors": "…" }
```

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/health` | cek service hidup |
| POST | `/api/v1/users` | buat user |
| GET | `/api/v1/users` | daftar semua user |
| GET | `/api/v1/users/:id` | detail user |
| PUT | `/api/v1/users/:id` | update user |
| DELETE | `/api/v1/users/:id` | hapus user |

### POST /api/v1/users

Body:

```json
{ "name": "Budi Santoso", "username": "budi", "password": "rahasia123" }
```

Validasi: `name` 2–100 karakter, `username` 3–50 karakter (huruf/angka), `password` minimal 8 karakter.

```bash
curl -X POST localhost:8080/api/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi Santoso","username":"budi","password":"rahasia123"}'
```

`201 Created`:

```json
{
  "success": true,
  "message": "user berhasil dibuat",
  "data": { "id": 1, "name": "Budi Santoso", "username": "budi", "created_at": "2026-09-27T13:35:13+07:00" }
}
```

`409 Conflict` bila username sudah dipakai, `400 Bad Request` bila payload tidak valid.

`password` tidak pernah dikembalikan di response.

### Endpoint lainnya

```bash
curl localhost:8080/api/v1/users
curl localhost:8080/api/v1/users/1
curl -X PUT localhost:8080/api/v1/users/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi S."}'
curl -X DELETE localhost:8080/api/v1/users/1
```

PUT menerima sebagian field saja (partial update). Kosongkan field yang tidak ingin diubah.

---

## 10. Menambah Resource Baru

Pola yang dipakai konsisten — ikuti urutan ini:

1. **Model** — `internal/model/<resource>.go`, tulis struct + `TableName()`.
2. **Migration** — `migrations/000X_<resource>.up.sql` dan `.down.sql`.
3. **Repository** — `internal/repository/<resource>_repository.go` (query DB saja).
4. **Service** — `internal/service/<resource>_service.go` (business logic).
5. **Handler** — `internal/handler/<resource>_handler.go` (parse request → service → response).
6. **Route** — daftarkan di `internal/router/router.go` dalam group `v1`.

Handler tidak boleh berisi query DB atau business logic.

---

## 11. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Error loading .env file` | `.env` belum dibuat → `cp .env.example .env` |
| `failed to connect to database` | PostgreSQL mati / kredensial salah → cek `pg_isready` dan isi `.env` |
| `fatal: PORT environment variable is required` | `PORT` kosong di `.env` |
| `address already in use` | Port 8080 dipakai proses lain → `pkill -f 'go run'` atau ganti `PORT` |
| `migrate: menerapkan …` gagal di tengah | Baca statement yang error. Karena per-file transaksi, migration itu di-rollback utuh dan bisa diulang setelah file diperbaiki |
| Frontend gagal fetch API | Backend belum jalan, atau URL salah (harus `http://localhost:8080`) |
| `localhost:5173` jalan tapi `127.0.0.1:5173` tidak | Vite hanya bind ke IPv6 (`::1`) di sebagian sistem → pakai `localhost`, atau jalankan `npm run dev -- --host 127.0.0.1` |
| `username` duplikat saat migrasi data lama | Kolom `username` di-backfill dari `email`; duplikat otomatis diberi suffix `_<id>` |

Reset database dari nol:

```bash
PGPASSWORD=kelompok9 psql -h localhost -U kelompok9 -d kelompok9 \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
go run ./cmd/api     # migration jalan ulang dari awal
```
