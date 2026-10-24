-- JWT jauh lebih panjang dari 64 karakter, jadi kolom token dilebarkan ke TEXT.
ALTER TABLE session ALTER COLUMN token TYPE TEXT;
