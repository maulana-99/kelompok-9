-- Hitung berapa kali user memutar lagu yang sama (dipakai mix "Sering kamu putar").
-- Baris lama dianggap sudah diputar sekali.
ALTER TABLE user_listening_history ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 1;
