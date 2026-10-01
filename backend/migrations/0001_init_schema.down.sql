-- 0001_init_schema.down.sql
-- Rollback: hapus semua tabel skema awal (urutan terbalik dari dependency FK).

DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS playlist_song;
DROP TABLE IF EXISTS playlist;
DROP TABLE IF EXISTS user_listening_history;
DROP TABLE IF EXISTS follow;
DROP TABLE IF EXISTS users;
