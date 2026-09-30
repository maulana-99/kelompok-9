ALTER TABLE session ADD COLUMN token VARCHAR(64) NOT NULL UNIQUE;

CREATE INDEX idx_session_token ON session (token);
