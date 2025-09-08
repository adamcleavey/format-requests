-- init_db.sql
-- Migration script to initialize the database for Format Poker.
-- Creates `formats` and `votes` tables and adds useful indexes.
-- This file is intended to be executed once during database provisioning.
-- Example: psql "$DATABASE_URL" -f init_db.sql

-- Create pgcrypto extension (provides gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Formats table: one row per format
CREATE TABLE IF NOT EXISTS formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  votes INTEGER NOT NULL DEFAULT 0
);

-- Ensure we don't accidentally insert exact duplicate names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ux_formats_name_lower ON formats (lower(name));

-- Votes table: records that a device has voted for a format.
-- Composite primary key prevents duplicate votes per (device, format).
CREATE TABLE IF NOT EXISTS votes (
  device_id UUID NOT NULL,
  format_id UUID NOT NULL REFERENCES formats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, format_id)
);

-- Index to quickly answer "who voted for this format?" or count votes (if needed)
CREATE INDEX IF NOT EXISTS idx_votes_format_id ON votes (format_id);

-- Index to speed up ordering by votes on formats
CREATE INDEX IF NOT EXISTS idx_formats_votes_desc ON formats (votes DESC);

-- Optional: seed initial formats (run this only when initializing a fresh DB).
-- The votes column is given a small random starter value (0-7) to mimic demo data.
-- Remove or comment out this block if you don't want the seed data inserted automatically.

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
