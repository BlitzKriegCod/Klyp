import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper.service';
import { ResolverService } from '../services/resolver.service';
import { exec } from 'child_process';

function runCommandWithTimeout(cmd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export class MediaController {
  static async getPackage(req: Request, res: Response) {
    const { url, limit = 100 } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // 1. Dedicated AnimeFLV handler
    if (url.toLowerCase().includes('animeflv.net')) {
      try {
        const data = await ScraperService.extractAnimeFlvPackage(url.trim());
        return res.json(data);
      } catch (e: any) {
        console.warn('[MediaController] AnimeFLV package extraction note:', e.message);
      }
    }

    // 2. YouTube / Generic playlists via yt-dlp
    try {
      const cleanUrl = url.replace(/"/g, '\\"');
      const output = await runCommandWithTimeout(
        `yt-dlp --dump-single-json --flat-playlist --socket-timeout 15 --playlist-end ${limit} "${cleanUrl}"`,
        25000
      );
      const parsed = JSON.parse(output);
      const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [parsed];
      const cleanEntries = rawEntries.map((item: any, idx: number) => {
        const epNum = item.playlist_index || item.episode_number || (idx + 1);
        const itemUrl = item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : url);
        const dur = typeof item.duration === 'number' ? item.duration : 0;
        const fmtType = ScraperService.classifyContentFormat(dur, itemUrl, item.title || '', item.extractor || 'Web');
        return {
          id: item.id || `ep-${epNum}`,
          episodeNumber: epNum,
          title: item.title || `Episode / Item ${epNum}`,
          url: itemUrl,
          duration: item.duration_string || (dur > 0 ? formatDuration(dur) : 'Unknown'),
          thumbnail: item.thumbnails?.[0]?.url || item.thumbnail || '',
          author: item.uploader || item.channel || parsed.uploader || parsed.title || 'Creator',
          format_type: fmtType
        };
      });

      const isSingleLong = cleanEntries.length === 1 && ((parsed.duration || 0) >= 3600 || /movie|pelicula|film/i.test(parsed.title || ''));

      return res.json({
        title: parsed.title || 'Media Package',
        synopsis: parsed.description || '',
        coverUrl: parsed.thumbnails?.[0]?.url || parsed.thumbnail || cleanEntries[0]?.thumbnail || '',
        format_type: isSingleLong ? 'movie' : 'series',
        totalEpisodes: cleanEntries.length,
        playlist_count: cleanEntries.length,
        entries: cleanEntries
      });
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to expand media package';

      // 3. YouTube Cloud Bot Check Mitigation via oEmbed API
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
          const oembedData = await ResolverService.resolveYouTubeOEmbed(url);
          return res.json(oembedData);
        } catch (oembedErr) {
          console.warn('[MediaController] oEmbed fallback note:', oembedErr);
        }
      }

      const cleanMsg = String(errorMsg)
        .split('\n')
        .filter((l) => !l.startsWith('Deprecated Feature:') && !l.startsWith('WARNING:'))
        .find((l) => l.includes('ERROR:')) || errorMsg;

      return res.status(422).json({
        error: String(cleanMsg).replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/i, '').trim()
      });
    }
  }

  static async getMirrors(req: Request, res: Response) {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const mirrors = await ResolverService.extractMediaMirrors(url);
    return res.json({ url, count: mirrors.length, mirrors });
  }

  static async expandPlaylist(req: Request, res: Response) {
    const { url, limit = 50 } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const data = await ResolverService.expandPlaylist(url, limit);
      return res.json(data);
    } catch (err: any) {
      return res.status(422).json({ error: err.message || 'Playlist expansion failed' });
    }
  }
}
