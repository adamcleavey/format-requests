-- seed_db.sql
-- Optional seed data for Format Poker. Inserts a set of initial formats.
-- Safe to run multiple times: uses ON CONFLICT DO NOTHING against the
-- case-insensitive unique index on lower(name) created by init_db.sql.
--
-- Usage:
--   psql "$DATABASE_URL" -f seed_db.sql
--
BEGIN;

INSERT INTO formats (name, kind, status, created_at, votes) VALUES
  ('AVIF', 'image', 'Supported', now(), (floor(random()*8))::int),
  ('HEIF/HEIC', 'image', 'Requested', now(), (floor(random()*8))::int),
  ('WebP', 'image', 'Supported', now(), (floor(random()*8))::int),
  ('SVG', 'image', 'Supported', now(), (floor(random()*8))::int),
  ('TIFF', 'image', 'Requested', now(), (floor(random()*8))::int),
  ('JPEG XL (JXL)', 'image', 'Requested', now(), (floor(random()*8))::int),
  ('MP4/H.264', 'video', 'Supported', now(), (floor(random()*8))::int),
  ('H.265/HEVC', 'video', 'Requested', now(), (floor(random()*8))::int),
  ('AV1', 'video', 'Requested', now(), (floor(random()*8))::int),
  ('WebM/VP9', 'video', 'Requested', now(), (floor(random()*8))::int),
  ('HLS (m3u8)', 'video', 'Planned', now(), (floor(random()*8))::int),
  ('MPEG-TS', 'video', 'Requested', now(), (floor(random()*8))::int),
  ('MP3', 'audio', 'Supported', now(), (floor(random()*8))::int),
  ('AAC (m4a)', 'audio', 'Supported', now(), (floor(random()*8))::int),
  ('FLAC', 'audio', 'Requested', now(), (floor(random()*8))::int),
  ('WAV', 'audio', 'Planned', now(), (floor(random()*8))::int),
  ('OGG Vorbis', 'audio', 'Requested', now(), (floor(random()*8))::int),
  ('Opus', 'audio', 'Requested', now(), (floor(random()*8))::int)
ON CONFLICT (lower(name)) DO NOTHING;

COMMIT;
