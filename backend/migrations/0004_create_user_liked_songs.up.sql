
CREATE TABLE user_liked_songs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    music_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT user_liked_songs_unique_pair
        UNIQUE (user_id, music_id)
);

CREATE INDEX idx_user_liked_songs_user_id
    ON user_liked_songs (user_id);
  