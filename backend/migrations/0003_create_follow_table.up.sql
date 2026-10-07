-- Membuat tabel relasi follow (mengikuti antar pengguna)
CREATE TABLE IF NOT EXISTS follow (
    id SERIAL PRIMARY KEY,
    following_id INT NOT NULL,
    follower_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT follow_unique_pair UNIQUE (following_id, follower_id),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);