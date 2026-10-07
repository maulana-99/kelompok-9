# Kelompok 9 — Melodi Music

Aplikasi musik (playlist, follow, riwayat dengar) dengan backend REST API dan frontend React.

| Bagian | Stack |
|---|---|
| Backend | Go 1.27 + Gin + GORM |
| Database | PostgreSQL 18 (minimal 13) |
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS 3 |

Panduan ini berlaku untuk **Windows, macOS, dan Linux**. Perintah yang berbeda antar-OS ditulis terpisah:

- **bash/zsh** — macOS, Linux, dan Git Bash / WSL di Windows.
- **PowerShell** — Windows (default terminal di Windows 10/11 dan VS Code).

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
│   │   ├── middleware/              # logger, CORS, auth (Bearer token)
│   │   ├── router/                  # daftar semua route
│   │   └── response/                # format response JSON seragam
│   └── .env                         # konfigurasi lokal (tidak di-commit)
└── frontend/
    ├── src/
    │   ├── pages/                   # halaman (Login, Signup, Home, dashboard, ...)
    │   ├── components/              # komponen reusable
    │   ├── context/                 # AuthContext (state login)
    │   ├── lib/api.ts               # client API ke backend
    │   └── App.tsx
    └── .env                         # VITE_API_URL (tidak di-commit)
```

---

## 2. Prasyarat

| Tool | Versi | Catatan |
|---|---|---|
| Go | ≥ 1.27 | Go ≥ 1.21 otomatis mengunduh toolchain sesuai `go.mod` |
| Node.js | ≥ 20.19 atau ≥ 22.12 | syarat Vite 8; npm ikut terpasang |
| PostgreSQL | 18 (minimal 13) | perlu `psql` di `PATH` |
| Git | terbaru | |

### Instalasi

**Windows** (PowerShell, pakai [winget](https://learn.microsoft.com/windows/package-manager/winget/)):

```powershell
winget install GoLang.Go
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

PostgreSQL: unduh installer dari <https://www.postgresql.org/download/windows/>. Catat password user `postgres` yang dibuat saat instalasi. Lalu tambahkan folder `bin` ke `PATH` agar `psql` bisa dipanggil:

```powershell
# sesuaikan angka versi dengan yang terpasang
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", "User")
```

Tutup lalu buka lagi terminal setelah instalasi agar `PATH` baru terbaca.

**macOS** ([Homebrew](https://brew.sh)):

```bash
brew install go node postgresql@18
brew link postgresql@18 --force     # agar psql masuk PATH
```

**Linux — Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-client git
```

Versi Go dan Node di repo apt biasanya terlalu lama. Pasang Go dari <https://go.dev/dl/> dan Node dari <https://nodejs.org> (atau lewat [nvm](https://github.com/nvm-sh/nvm): `nvm install --lts`).

**Linux — Fedora:**

```bash
sudo dnf install golang nodejs postgresql-server postgresql git
sudo postgresql-setup --initdb
```

**Linux — Arch:**

```bash
sudo pacman -S go nodejs npm postgresql git
sudo -u postgres initdb -D /var/lib/postgres/data
```

### Cek versi

Perintah sama di semua OS:

```bash
go version
node -v
npm -v
psql --version
```

### Menjalankan PostgreSQL

| OS | Perintah |
|---|---|
| Windows | Otomatis jalan sebagai service setelah instalasi. Cek: `Get-Service postgresql*`. Start manual: `Start-Service postgresql-x64-18` (PowerShell as Administrator) |
| macOS | `brew services start postgresql@18` |
| Linux (systemd) | `sudo systemctl enable --now postgresql` |

Cek koneksi (semua OS):

```bash
pg_isready -h localhost -p 5432     # harus: accepting connections
```

---

## 3. Setup Database

Buat user dan database (sekali saja). Pertama, masuk ke `psql` sebagai superuser:

| OS | Perintah |
|---|---|
| Windows | `psql -U postgres` (masukkan password dari installer) |
| macOS (Homebrew) | `psql postgres` (superuser = user macOS kamu) |
| Linux | `sudo -u postgres psql` |

Lalu jalankan SQL ini di prompt `psql` (ganti password kalau perlu), kemudian keluar dengan `\q`:

```sql
CREATE USER kelompok9 WITH PASSWORD 'kelompok9';
CREATE DATABASE kelompok9 OWNER kelompok9;
GRANT ALL PRIVILEGES ON DATABASE kelompok9 TO kelompok9;
```

> Tabel **tidak perlu dibuat manual**. Aplikasi menjalankan migration otomatis saat start.

---

## 4. Setup Backend

Salin file konfigurasi, lalu sesuaikan isinya (kredensial DB, port):

```bash
# bash/zsh
cd backend
cp .env.example .env
go mod download
```

```powershell
# PowerShell
cd backend
Copy-Item .env.example .env
go mod download
```

Jalankan (semua OS, **dari folder `backend/`** karena `.env` dibaca dari folder kerja saat ini):

```bash
go run ./cmd/api
```

Output yang diharapkan:

```
database terkoneksi ke localhost:5432/kelompok9
migrate: menerapkan 0001_init_schema
migrate: menerapkan 0002_add_token_to_session
migrate: skema database up-to-date
server jalan di port 8080 (env: development)
```

Cek cepat: buka <http://localhost:8080/health> di browser → `{"success":true,...}`

Build binary produksi:

```bash
# bash/zsh
go build -o bin/api ./cmd/api
./bin/api
```

```powershell
# PowerShell
go build -o bin\api.exe .\cmd\api
.\bin\api.exe
```

Binary tetap butuh `.env` di folder tempat ia dijalankan. Folder `bin/` sudah di-ignore git.

---

## 5. Setup Frontend

```bash
# bash/zsh
cd frontend
cp .env.example .env      # opsional, default sudah http://localhost:8080/api/v1
npm install
npm run dev               # http://localhost:5173
```

```powershell
# PowerShell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

> Kalau PowerShell menolak `npm` dengan pesan `running scripts is disabled on this system`, jalankan sekali:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Perintah lain (semua OS):

| Perintah | Fungsi |
|---|---|
| `npm run dev` | dev server + hot reload |
| `npm run build` | type-check + build produksi ke `dist/` |
| `npm run preview` | preview hasil build |
| `npm run lint` | jalankan oxlint |

---

## 6. Menjalankan Semua (Development)

Butuh **2 terminal** (perintah sama di semua OS):

```bash
# Terminal 1 — backend
cd backend
go run ./cmd/api          # http://localhost:8080

# Terminal 2 — frontend
cd frontend
npm run dev               # http://localhost:5173
```

Backend mengizinkan CORS dari origin mana pun, jadi frontend bisa langsung memanggil `http://localhost:8080/api/v1/...`.

---

## 7. Migration Database

Migration memakai file SQL di `backend/migrations/`, dijalankan otomatis saat aplikasi start. Versi yang sudah diterapkan dicatat di tabel `schema_migrations`, jadi aman dijalankan berulang.

**Membuat migration baru:**

```
backend/migrations/0003_nama_perubahan.up.sql     # perubahan
backend/migrations/0003_nama_perubahan.down.sql   # rollback
```

- Nama file wajib `000X_*.up.sql` — nomor menentukan urutan eksekusi.
- Satu migration dijalankan dalam satu transaksi: kalau ada statement gagal, semuanya dibatalkan.
- Setelah file dibuat, cukup restart server.

Contoh perintah `psql` di bawah memakai connection URI dan tanda kutip ganda, jadi bisa dipakai apa adanya di bash, zsh, PowerShell, maupun cmd. Jalankan dari folder `backend/`.

**Rollback manual** (tidak otomatis):

```bash
psql "postgresql://kelompok9:kelompok9@localhost:5432/kelompok9" -f migrations/0003_nama_perubahan.down.sql
psql "postgresql://kelompok9:kelompok9@localhost:5432/kelompok9" -c "DELETE FROM schema_migrations WHERE version = '0003_nama_perubahan'"
```

**Lihat isi database:**

```bash
psql "postgresql://kelompok9:kelompok9@localhost:5432/kelompok9" -c "\dt"
psql "postgresql://kelompok9:kelompok9@localhost:5432/kelompok9" -c "\d playlist"
```

Alternatif GUI: pgAdmin (ikut terpasang di installer Windows), DBeaver, atau TablePlus.

---

## 8. Skema Database

```
users(id, name, username UNIQUE, password, created_at)
  │
  ├── follow(id, following_id NN, follower_id NN)              UNIQUE(following_id, follower_id), tidak boleh follow diri sendiri
  ├── user_listening_history(id, user_id NN, music_id, last_played)
  ├── playlist(id, title, description, user_id NN, status, created_at)
  │     └── playlist_song(id, playlist_id NN, music_id, status, created_at)   UNIQUE(playlist_id, music_id)
  └── session(id, user_id NN, token, status, created_at)
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

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | – | cek service hidup |
| POST | `/api/v1/auth/login` | – | login, dapat token |
| POST | `/api/v1/auth/logout` | Bearer | hapus sesi |
| GET | `/api/v1/auth/me` | Bearer | data user yang sedang login |
| POST | `/api/v1/users` | – | buat user (signup) |
| GET | `/api/v1/users` | – | daftar semua user |
| GET | `/api/v1/users/:id` | – | detail user |
| PUT | `/api/v1/users/:id` | Bearer | update user |
| DELETE | `/api/v1/users/:id` | Bearer | hapus user |

Endpoint ber-auth butuh header `Authorization: Bearer <token>`. Tanpa token valid → `401 belum login`.

### POST /api/v1/users

Body:

```json
{ "name": "Budi Santoso", "username": "budi", "password": "rahasia123" }
```

Validasi: `name` 2–100 karakter, `username` 3–50 karakter (huruf/angka), `password` minimal 8 karakter.

`201 Created`:

```json
{
  "success": true,
  "message": "user berhasil dibuat",
  "data": { "id": 1, "name": "Budi Santoso", "username": "budi", "created_at": "2026-09-27T13:35:13+07:00" }
}
```

`409 Conflict` bila username sudah dipakai, `400 Bad Request` bila payload tidak valid. `password` tidak pernah dikembalikan di response.

### POST /api/v1/auth/login

Body: `{ "username": "budi", "password": "rahasia123" }`

`200 OK` → `data` berisi `token` dan `user`. `401` bila username/password salah.

### Contoh request

**bash/zsh** (macOS, Linux, Git Bash):

```bash
# signup
curl -X POST localhost:8080/api/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi Santoso","username":"budi","password":"rahasia123"}'

# login, simpan token
TOKEN=$(curl -s -X POST localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"rahasia123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

curl localhost:8080/api/v1/users
curl localhost:8080/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
curl -X PUT localhost:8080/api/v1/users/1 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Budi S."}'
curl -X DELETE localhost:8080/api/v1/users/1 -H "Authorization: Bearer $TOKEN"
```

**PowerShell** (Windows). Pakai `Invoke-RestMethod`, karena di Windows PowerShell 5.1 `curl` adalah alias `Invoke-WebRequest` dan tanda kutip JSON sering rusak:

```powershell
$api = "http://localhost:8080/api/v1"

# signup
Invoke-RestMethod -Method Post "$api/users" -ContentType "application/json" `
  -Body (@{ name = "Budi Santoso"; username = "budi"; password = "rahasia123" } | ConvertTo-Json)

# login, simpan token
$login = Invoke-RestMethod -Method Post "$api/auth/login" -ContentType "application/json" `
  -Body (@{ username = "budi"; password = "rahasia123" } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.data.token)" }

Invoke-RestMethod "$api/users"
Invoke-RestMethod "$api/auth/me" -Headers $headers
Invoke-RestMethod -Method Put "$api/users/1" -Headers $headers -ContentType "application/json" `
  -Body (@{ name = "Budi S." } | ConvertTo-Json)
Invoke-RestMethod -Method Delete "$api/users/1" -Headers $headers
```

PUT menerima sebagian field saja (partial update). Field yang tidak dikirim tidak diubah.

---

## 10. Menambah Resource Baru

Pola yang dipakai konsisten — ikuti urutan ini:

1. **Model** — `internal/model/<resource>.go`, tulis struct + `TableName()`.
2. **Migration** — `migrations/000X_<resource>.up.sql` dan `.down.sql`.
3. **Repository** — `internal/repository/<resource>_repository.go` (query DB saja).
4. **Service** — `internal/service/<resource>_service.go` (business logic).
5. **Handler** — `internal/handler/<resource>_handler.go` (parse request → service → response).
6. **Route** — daftarkan di `internal/router/router.go` dalam group `v1`. Pasang `requireAuth` untuk route yang butuh login.

Handler tidak boleh berisi query DB atau business logic.

---

## 11. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Error loading .env file` | `.env` belum dibuat, atau server dijalankan bukan dari folder `backend/` → salin `.env.example` ke `.env` (lihat bagian 4) |
| `failed to connect to database` | PostgreSQL mati / kredensial salah → cek `pg_isready` dan isi `.env` |
| `fatal: PORT environment variable is required` | `PORT` kosong di `.env` |
| `address already in use` / `Only one usage of each socket address` | Port 8080 dipakai proses lain → lihat "Port bentrok" di bawah, atau ganti `PORT` di `.env` |
| `psql` / `pg_isready`: command not found / not recognized | Folder `bin` PostgreSQL belum masuk `PATH` (lihat bagian 2), lalu buka ulang terminal |
| `psql: FATAL: password authentication failed for user "postgres"` (Windows) | Pakai password yang diisi saat instalasi PostgreSQL |
| `role "postgres" does not exist` (macOS) | Homebrew memakai user macOS sebagai superuser → `psql postgres` |
| `running scripts is disabled on this system` (Windows) | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `migrate: menerapkan …` gagal di tengah | Baca statement yang error. Karena per-file transaksi, migration itu di-rollback utuh dan bisa diulang setelah file diperbaiki |
| Frontend gagal fetch API | Backend belum jalan, atau `VITE_API_URL` di `frontend/.env` salah (default `http://localhost:8080/api/v1`). Restart `npm run dev` setelah ubah `.env` |
| `localhost:5173` jalan tapi `127.0.0.1:5173` tidak | Vite hanya bind ke IPv6 (`::1`) di sebagian sistem → pakai `localhost`, atau `npm run dev -- --host 127.0.0.1` |
| `username` duplikat saat migrasi data lama | Kolom `username` di-backfill dari `email`; duplikat otomatis diberi suffix `_<id>` |

**Port bentrok** — cari lalu matikan proses yang memakai port 8080:

```bash
# macOS / Linux
lsof -i :8080
kill <PID>
```

```powershell
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

**Reset database dari nol** (semua data hilang). Jalankan dari folder `backend/`:

```bash
psql "postgresql://kelompok9:kelompok9@localhost:5432/kelompok9" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
go run ./cmd/api     # migration jalan ulang dari awal
```
