import path from 'path';
import fs from 'fs';
import { DOWNLOADS_DIR } from '../config/env';

export class FileService {
  public static upscaleArtwork(url?: string): string {
    if (!url) return '';
    return url.replace(/\/\d+x\d+bb\.jpg/i, '/1200x1200bb.jpg');
  }

  public static sanitizePathComponent(name: string): string {
    return (name || 'Unknown')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static isSafeDownloadPath(targetPath: string): boolean {
    const resolved = path.resolve(targetPath);
    return resolved.startsWith(DOWNLOADS_DIR);
  }

  public static findOutputFile(prefix: string, dir: string = DOWNLOADS_DIR): string | null {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = FileService.findOutputFile(prefix, fullPath);
          if (found) return found;
        } else if (entry.name.includes(prefix) && !entry.name.endsWith('.part') && !entry.name.endsWith('.ytdl')) {
          return fullPath;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
