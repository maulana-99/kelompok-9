-- 0001_init_schema.up.sql
-- Skema awal sesuai ERD: users, follow, user_listening_history, playlist, playlist_song, session.
--
-- Catatan keputusan (di luar gambar ERD, tapi perlu untuk integritas data):
--   * Kolom yang ditandai "NN" di ERD  -> NOT NULL (semuanya kolom foreign key).
--     Kolom lain tanpa "NN" dibiarkan nullable, persis seperti gambar.
--   * UNIQUE / index ditambahkan supaya data tidak duplikat dan query relasi cepat.
--   * ON DELETE CASCADE: menghapus user ikut membersihkan data turunannya.

-- === users ===============================================================
-- IF NOT EXISTS: database lama (hasil GORM AutoMigrate) sudah punya tabel users.
-- Bentuk akhirnya disamakan ke ERD oleh reconcileLegacySchema() sebelum file ini jalan.
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    username   VARCHAR(50)  NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- === follow ==============================================================
-- following_id : user yang diikuti
-- follower_id  : user yang mengikuti
CREATE TABLE follow (
    id           SERIAL  PRIMARY KEY,
    following_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    follower_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT follow_unique_pair UNIQUE (following_id, follower_id),
    CONSTRAINT follow_no_self     CHECK (following_id <> follower_id)
);

CREATE INDEX idx_follow_following_id ON follow (following_id);
CREATE INDEX idx_follow_follower_id  ON follow (follower_id);

-- === user_listening_history =============================================
CREATE TABLE user_listening_history (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    music_id    VARCHAR(255),
    last_played TIMESTAMP    DEFAULT NOW()
);

-- Query utama tabel ini: "lagu terakhir diputar user X" -> (user_id, last_played DESC).
CREATE INDEX idx_ulh_user_last_played ON user_listening_history (user_id, last_played DESC);

-- === playlist ============================================================
CREATE TABLE playlist (
    id          SERIAL       PRIMARY KEY,
    title       VARCHAR(255),
    description TEXT,
    user_id     INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status      VARCHAR(50),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playlist_user_id ON playlist (user_id);

-- === playlist_song =======================================================
CREATE TABLE playlist_song (
    id          SERIAL       PRIMARY KEY,
    playlist_id INTEGER      NOT NULL REFERENCES playlist (id) ON DELETE CASCADE,
    music_id    VARCHAR(255),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT playlist_song_unique_track UNIQUE (playlist_id, music_id)
);

CREATE INDEX idx_playlist_song_playlist_id ON playlist_song (playlist_id);

-- === session =============================================================
CREATE TABLE session (
    id         SERIAL    PRIMARY KEY,
    user_id    INTEGER   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status     BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_user_id ON session (user_id);
