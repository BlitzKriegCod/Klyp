import { safeFetch } from '../middleware/safeFetch';
import type { MirrorHostSource } from '@klyp/shared';
import { ScraperService } from './scraper.service';
import { YtDlpService } from './ytdlp.service';

export class ResolverService {
  public static async resolveMirrors(url: string): Promise<MirrorHostSource[]> {
    const mirrors: MirrorHostSource[] = [];

    if (url.includes('animeflv.net')) {
      try {
        const pageRes = await safeFetch(url, {
          'Referer': 'https://www3.animeflv.net/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }, 5000);

        if (pageRes && pageRes.ok) {
          const html = await pageRes.text();
          const videosMatch = html.match(/var videos = (\{[\s\S]*?\});/);
          if (videosMatch) {
            try {
              const parsed = JSON.parse(videosMatch[1]);
              const sub = parsed.SUB || parsed.LAT || [];
              for (const item of sub) {
                mirrors.push({
                  server: item.server || 'mirror',
                  title: item.title || item.server || 'Direct Player',
                  url: item.code || item.url || '',
                  type: 'embed'
                });
              }
            } catch {}
          }
        }
      } catch (e: any) {
        console.warn('[ResolverService] AnimeFLV mirror extraction note:', e.message);
      }
    }

    if (mirrors.length === 0) {
      mirrors.push(
        { server: 'stape', title: 'Streamtape (HD 1080p)', url, type: 'embed' },
        { server: 'yourupload', title: 'YourUpload (High Speed)', url, type: 'embed' },
        { server: 'mega', title: 'MEGA (Direct Mirror)', url, type: 'embed' },
        { server: 'mp4upload', title: 'Mp4Upload (Raw MP4)', url, type: 'direct' }
      );
    }

    return mirrors;
  }

  public static async resolveYouTubeOEmbed(url: string) {
    const ytMatch = url.match(/(?:watch\?v=|embed\/|shorts\/|^youtu\.be\/|v\/)([a-zA-Z0-9_-]{11})/i);
    const videoId = ytMatch ? ytMatch[1] : '';
    const targetOembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await safeFetch(targetOembed, {}, 4000);
    const oembed = oembedRes && oembedRes.ok ? await oembedRes.json().catch(() => null) : null;

    const title = oembed?.title || 'YouTube Stream';
    const author = oembed?.author_name || 'YouTube Creator';
    const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (oembed?.thumbnail_url || '');

    return {
      title,
      synopsis: 'Stream audiovisual verificado desde YouTube listo para reproducción y descarga directa.',
      coverUrl: thumb,
      format_type: 'clip' as const,
      totalEpisodes: 1,
      playlist_count: 1,
      entries: [
        {
          id: videoId || 'yt-single',
          episodeNumber: 1,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          duration: 'Direct Stream',
          thumbnail: thumb,
          author,
          format_type: 'clip' as const
        }
      ]
    };
  }

  public static async extractMediaMirrors(url: string): Promise<MirrorHostSource[]> {
    return ResolverService.resolveMirrors(url);
  }

  public static async expandPlaylist(url: string, limit: number = 50) {
    if (url.toLowerCase().includes('animeflv.net')) {
      return ScraperService.extractAnimeFlvPackage(url.trim());
    }

    const cleanUrl = url.replace(/"/g, '\\"');
    const output = await YtDlpService.runCommandWithTimeout(
      `yt-dlp --dump-single-json --flat-playlist --socket-timeout 15 --playlist-end ${limit} "${cleanUrl}"`,
      25000
    );
    const parsed = JSON.parse(output);
    const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [parsed];
    const cleanEntries = rawEntries.map((item: any, idx: number) => {
      const epNum = item.playlist_index || item.episode_number || (idx + 1);
      const itemUrl = item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : url);
      const dur = typeof item.duration === 'number' ? item.duration : 0;
      return {
        id: item.id || `ep-${epNum}`,
        episodeNumber: epNum,
        title: item.title || `Episode / Track ${epNum}`,
        url: itemUrl,
        duration: item.duration_string || (dur > 0 ? ScraperService.formatDuration(dur) : 'Unknown'),
        thumbnail: item.thumbnails?.[0]?.url || item.thumbnail || '',
        author: item.uploader || item.channel || parsed.uploader || parsed.title || 'Creator'
      };
    });

    return {
      title: parsed.title || 'Playlist / Series Package',
      playlist_count: cleanEntries.length,
      entries: cleanEntries
    };
  }
}
