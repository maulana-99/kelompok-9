DROP INDEX IF EXISTS idx_session_token;

ALTER TABLE session DROP COLUMN IF EXISTS token;
