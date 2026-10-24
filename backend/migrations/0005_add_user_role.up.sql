-- 0005_add_user_role.up.sql
-- RBAC: setiap user punya role. Default 'user'; admin hanya diberikan lewat
-- `go run ./cmd/admin -username <nama>` (tidak bisa lewat API / daftar sendiri).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
