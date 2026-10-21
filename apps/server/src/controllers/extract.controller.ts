import { Request, Response } from 'express';
import { YtDlpService } from '../services/ytdlp.service';
import { ResolverService } from '../services/resolver.service';
import { ScraperService } from '../services/scraper.service';

export class ExtractController {
  static async extractSingle(req: Request, res: Response) {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    const cleanUrl = url.trim();

    // Check if URL is an AnimeFLV franchise series
    if (cleanUrl.toLowerCase().includes('animeflv.net')) {
      try {
        const pack = await ScraperService.extractAnimeFlvPackage(cleanUrl);
        return res.json({
          url: cleanUrl,
          title: pack.title,
          thumbnail: pack.coverUrl,
          duration: '24:00',
          duration_formatted: '24:00',
          author: 'AnimeFLV',
          platform: 'AnimeFLV',
          platform_category: 'Anime & Series',
          platform_icon: '🎌',
          platform_color: '#f59e0b',
          available_qualities: ['1080p (Full HD)', '720p (HD)', '480p (SD)'],
          selected_quality: '1080p (Full HD)',
          download_subtitles: false,
          is_playlist: true,
          playlist_count: pack.totalEpisodes,
          entries: pack.entries,
          source: 'animeflv'
        });
      } catch (err: any) {
        console.warn('[ExtractController] AnimeFLV fallback note:', err.message);
      }
    }

    try {
      const data = await YtDlpService.extractSingleUrl(cleanUrl);
      return res.json(data);
    } catch (err: any) {
      console.warn('[ExtractController] yt-dlp extraction note:', err.message);

      // Bot check mitigation via oEmbed
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
        try {
          const oembed = await ResolverService.resolveYouTubeOEmbed(cleanUrl);
          return res.json({
            url: cleanUrl,
            title: oembed.title,
            thumbnail: oembed.coverUrl,
            duration: 180,
            duration_formatted: '03:00',
            author: oembed.entries[0]?.author || 'YouTube Creator',
            platform: 'YouTube',
            platform_category: 'Video Streaming',
            platform_icon: '🎬',
            platform_color: '#ef4444',
            available_qualities: ['1080p', '720p', '480p', 'Audio Only (MP3)'],
            selected_quality: '1080p',
            download_subtitles: false,
            is_playlist: false,
            playlist_count: 1,
            entries: oembed.entries,
            source: 'oembed_fallback'
          });
        } catch {}
      }

      return res.status(422).json({
        error: err.message || 'Extraction failed'
      });
    }
  }

  static async extractBatch(req: Request, res: Response) {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Array of URLs is required' });
    }

    const results: any[] = [];
    const errors: any[] = [];

    await Promise.all(
      urls.slice(0, 15).map(async (u: string) => {
        try {
          if (!u || typeof u !== 'string') return;
          const info = await YtDlpService.extractSingleUrl(u.trim());
          results.push(info);
        } catch (err: any) {
          errors.push({ url: u, error: err.message });
        }
      })
    );

    return res.json({
      total: urls.length,
      success_count: results.length,
      error_count: errors.length,
      results,
      errors
    });
  }
}
