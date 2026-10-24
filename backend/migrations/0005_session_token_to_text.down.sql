-- Kembalikan ke VARCHAR(64); session JWT yang lebih panjang dibuang dulu.
DELETE FROM session WHERE LENGTH(token) > 64;
ALTER TABLE session ALTER COLUMN token TYPE VARCHAR(64);
