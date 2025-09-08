export type SeedTuple = [string, string, string];

export const seed: SeedTuple[] = [
  ["AVIF", "image", "Supported"],
  ["HEIF/HEIC", "image", "Requested"],
  ["WebP", "image", "Supported"],
  ["SVG", "image", "Supported"],
  ["TIFF", "image", "Requested"],
  ["JPEG XL (JXL)", "image", "Requested"],
  ["MP4/H.264", "video", "Supported"],
  ["H.265/HEVC", "video", "Requested"],
  ["AV1", "video", "Requested"],
  ["WebM/VP9", "video", "Requested"],
  ["HLS (m3u8)", "video", "Planned"],
  ["MPEG-TS", "video", "Requested"],
  ["MP3", "audio", "Supported"],
  ["AAC (m4a)", "audio", "Supported"],
  ["FLAC", "audio", "Requested"],
  ["WAV", "audio", "Planned"],
  ["OGG Vorbis", "audio", "Requested"],
  ["Opus", "audio", "Requested"],
];
