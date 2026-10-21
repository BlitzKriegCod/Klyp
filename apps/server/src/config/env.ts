import path from 'path';
import fs from 'fs';
import dns from 'dns';

// Prefer IPv4 to avoid ConnectTimeoutError on unroutable IPv6 addresses
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

export const PORT = 3000;
export const HOST = '0.0.0.0';
export const ALT_PORT = process.env.PORT && process.env.PORT !== '3000' ? parseInt(process.env.PORT, 10) : null;
export const isProduction = process.env.NODE_ENV === 'production';
export const IS_PRODUCTION = isProduction;

// Root directory reference
export const ROOT_DIR = process.cwd();
export const WORKSPACE_ROOT = ROOT_DIR;

// Local binaries directory
export const BIN_DIR = path.resolve(ROOT_DIR, 'bin');
if (fs.existsSync(BIN_DIR)) {
  process.env.PATH = `${BIN_DIR}:${process.env.PATH || ''}`;
  try {
    const ytdlpPath = path.join(BIN_DIR, 'yt-dlp');
    if (fs.existsSync(ytdlpPath)) {
      fs.chmodSync(ytdlpPath, 0o755);
    }
  } catch {
    // Ignore permission errors if already set
  }
}

// Downloads & Music directory management
export const DOWNLOADS_DIR = path.resolve(ROOT_DIR, 'downloads');
export const MUSIC_DIR = path.resolve(DOWNLOADS_DIR, 'Music');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
}
