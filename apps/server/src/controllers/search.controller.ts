import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper.service';
import { hasBinary } from '../config/binaries';
import { exec } from 'child_process';
import { SearchResult } from '@klyp/shared';

function runCommandWithTimeout(cmd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
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

export class SearchController {
  static async suggestions(req: Request, res: Response) {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) return res.json({ suggestions: [] });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const ytSuggestRes = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }
      );
      clearTimeout(timeout);

      if (ytSuggestRes.ok) {
        const data = await ytSuggestRes.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return res.json({ suggestions: data[1].slice(0, 8) });
        }
      }
    } catch {}

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const ddgAcRes = await fetch(
        `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (ddgAcRes.ok) {
        const data = await ddgAcRes.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return res.json({ suggestions: data[1].slice(0, 8) });
        }
      }
    } catch {}

    return res.json({ suggestions: [] });
  }

  static async search(req: Request, res: Response) {
    const {
      query,
      site,
      domain,
      region = 'wt-wt',
      duration,
      quality,
      format,
      limit = 18,
      sortBy = 'relevance',
      offset = 0
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const effectiveSite = (site || domain || 'All').trim();
    const results: SearchResult[] = [];
    const hasYtDlp = await hasBinary('yt-dlp');

    const isAll = !effectiveSite || effectiveSite.toLowerCase() === 'all';
    const isYouTubeSearch = isAll || effectiveSite.toLowerCase() === 'youtube';
    const isSoundCloudSearch = isAll || effectiveSite.toLowerCase() === 'soundcloud';
    const isAnimeFLVSearch = isAll || effectiveSite.toLowerCase() === 'animeflv';
    const isOtherPlatform = isAll || ['vimeo', 'dailymotion', 'bilibili', 'tiktok', 'twitch', 'ok.ru', 'spotify', 'animeflv'].includes(effectiveSite.toLowerCase());

    const targetFetchCount = Math.min(60, (Number(offset) || 0) + (Number(limit) || 18) + 6);

    // 1. YouTube search via yt-dlp
    if (hasYtDlp && isYouTubeSearch) {
      try {
        const ytLimit = isAll ? Math.min(24, targetFetchCount) : targetFetchCount;
        const ytOut = await runCommandWithTimeout(`yt-dlp --dump-json --flat-playlist --socket-timeout 9 "ytsearch${ytLimit}:${query.replace(/"/g, '\\"')}"`, 12000);
        const lines = ytOut.split('\n').filter((l) => l.trim().startsWith('{'));
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            const dur = item.duration || 210;
            const videoId = item.id;
            const realThumb = videoId
              ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
              : item.thumbnails?.[0]?.url || item.thumbnail || '';

            results.push({
              id: videoId ? `yt-${videoId}` : `yt-${results.length}`,
              url: item.webpage_url || item.url || `https://www.youtube.com/watch?v=${videoId}`,
              title: ScraperService.decodeHtml(item.title || `${query} Video`),
              author: item.uploader || item.channel || 'YouTube Creator',
              duration: item.duration_string || formatDuration(dur),
              duration_seconds: dur,
              thumbnail: realThumb,
              platform: 'YouTube',
              platform_category: 'Video Streaming',
              platform_icon: '🎬',
              platform_color: '#ef4444',
              view_count: item.view_count || undefined,
              like_count: item.like_count || undefined,
              upload_date: item.upload_date || new Date().toISOString().split('T')[0],
              description: item.description || `YouTube video stream for ${query}.`,
              available_qualities: ['2160p (4K)', '1080p (Full HD)', '720p (HD)', '480p (SD)', 'Audio Only (MP3)'],
              is_part_of_series: /episode|season|ep\s*\d+|part\s*\d+/i.test(item.title || ''),
              series_name: /episode|ep\s*\d+/i.test(item.title || '') ? query : undefined,
              episode_number: undefined
            });
          } catch {}
        }
      } catch (e) {
        console.warn('[SearchController] ytsearch probe note:', e);
      }
    }

    // 2. SoundCloud search via yt-dlp
    if (hasYtDlp && isSoundCloudSearch && results.length < targetFetchCount) {
      try {
        const scLimit = isAll ? 8 : targetFetchCount;
        const scOut = await runCommandWithTimeout(`yt-dlp --dump-json --flat-playlist --socket-timeout 8 "scsearch${scLimit}:${query.replace(/"/g, '\\"')}"`, 10000);
        const lines = scOut.split('\n').filter((l) => l.trim().startsWith('{'));
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            const dur = item.duration || 180;
            results.push({
              id: `sc-${item.id || results.length}`,
              url: item.webpage_url || item.url,
              title: ScraperService.decodeHtml(item.title || `${query} Track`),
              author: item.uploader || 'SoundCloud Artist',
              duration: item.duration_string || formatDuration(dur),
              duration_seconds: dur,
              thumbnail: item.thumbnails?.[0]?.url || item.thumbnail || 'https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8f.png',
              platform: 'SoundCloud',
              platform_category: 'Music',
              platform_icon: '🎵',
              platform_color: '#f97316',
              view_count: item.view_count || undefined,
              upload_date: item.upload_date || new Date().toISOString().split('T')[0],
              description: `SoundCloud high-fidelity audio stream.`,
              available_qualities: ['Audio (HQ MP3 320kbps)', 'Audio (Original FLAC)', 'Audio (AAC)'],
              is_part_of_series: false
            });
          } catch {}
        }
      } catch (e) {
        console.warn('[SearchController] scsearch probe note:', e);
      }
    }

    // 3. DuckDuckGo multi-platform discovery
    if (isOtherPlatform && results.length < targetFetchCount) {
      const ddgResults = await ScraperService.searchDuckDuckGo(query, effectiveSite, targetFetchCount - results.length, region);
      for (const resItem of ddgResults) {
        if (!results.some((r) => r.url === resItem.url)) {
          results.push(resItem);
        }
      }
    }

    // 3.5 Dedicated AnimeFLV direct discovery fallback
    if (isAnimeFLVSearch && (effectiveSite.toLowerCase() === 'animeflv' || !results.some((r) => r.platform === 'AnimeFLV'))) {
      const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (slug.length >= 2) {
        const animeTitle = query
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const isPelícula = query.toLowerCase().includes('pelicula') || query.toLowerCase().includes('movie');

        const matchedFranKey = Object.keys(ScraperService.FRANCHISE_REGISTRY).find((k) =>
          slug === k || slug.startsWith(`${k}-`) || slug.includes(k)
        );
        const fran = matchedFranKey ? ScraperService.FRANCHISE_REGISTRY[matchedFranKey] : null;

        const totalFranEps = fran ? fran.seasons.reduce((acc: number, s: any) => acc + s.episodesCount, 0) : (isPelícula ? 1 : 24);
        const totalSeasons = fran ? fran.seasons.length : 1;
        const displayTitle = fran ? fran.title : `${animeTitle} ${isPelícula ? '(Película)' : '(Serie Completa)'}`;
        const displayDuration = fran
          ? `${totalSeasons} Temporadas (${totalFranEps} Eps)`
          : (isPelícula ? '01:52:00' : '24 Episodios');

        results.push({
          id: `animeflv-${slug}`,
          url: `https://www3.animeflv.net/anime/${fran ? fran.coverSlug : slug}`,
          title: displayTitle,
          author: 'AnimeFLV',
          duration: displayDuration,
          duration_seconds: isPelícula ? 6720 : totalFranEps * 1440,
          thumbnail: `https://www3.animeflv.net/uploads/animes/covers/${fran ? fran.coverSlug : slug}.jpg`,
          platform: 'AnimeFLV',
          platform_category: 'Anime & Series',
          platform_icon: '🎌',
          platform_color: '#f59e0b',
          upload_date: new Date().toISOString().split('T')[0],
          description: fran ? fran.synopsis : `Anime y episodios completos de ${animeTitle} en calidad Full HD 1080p / 720p.`,
          available_qualities: ['1080p (Full HD)', '720p (HD)', '480p (SD)', 'Audio Only (MP3)'],
          is_part_of_series: true,
          series_name: fran ? fran.title : animeTitle,
          is_anime: true,
          format_type: isPelícula ? 'movie' : 'series',
          total_episodes: totalFranEps,
          total_seasons: totalSeasons,
          seasons_summary: fran ? `${totalSeasons} Temporadas (${totalFranEps} Eps)` : undefined
        });
      }
    }

    // 4. Audiovisual Format Classification for all items
    for (const item of results) {
      if (!item.format_type) {
        const durSec = item.duration_seconds || 0;
        item.format_type = ScraperService.classifyContentFormat(durSec, item.url, item.title, item.platform);
      }
      if (item.platform === 'AnimeFLV' || /anime/i.test(item.title) || /anime/i.test(item.url)) {
        item.is_anime = true;
      }
      if (item.format_type === 'series' || item.format_type === 'movie') {
        item.is_part_of_series = true;
        if (!item.series_name) {
          item.series_name = item.title.replace(/ep(isode)?\s*\d+/i, '').replace(/temporada\s*\d+/i, '').trim();
        }
      }
    }

    // 5. Server-Side Filtering
    let filtered = results;

    if (duration && duration !== 'Any') {
      if (duration === 'short') {
        filtered = filtered.filter((item) => (item.duration_seconds || 200) < 240);
      } else if (duration === 'medium') {
        filtered = filtered.filter((item) => {
          const s = item.duration_seconds || 300;
          return s >= 240 && s <= 1200;
        });
      } else if (duration === 'long') {
        filtered = filtered.filter((item) => (item.duration_seconds || 600) > 1200);
      }
    }

    if (quality && quality !== 'Any' && quality !== 'All') {
      filtered = filtered.filter((item) => {
        if (!item.available_qualities || !Array.isArray(item.available_qualities)) return true;
        return item.available_qualities.some((q: string) => q.toLowerCase().includes(String(quality).toLowerCase()));
      });
    }

    if (format && format !== 'Any' && format !== 'All') {
      const fmtLower = format.toLowerCase();
      if (fmtLower === 'movie' || fmtLower === 'movies' || fmtLower === 'film') {
        filtered = filtered.filter((item) => item.format_type === 'movie');
      } else if (fmtLower === 'series' || fmtLower === 'anime' || fmtLower === 'episodes') {
        filtered = filtered.filter((item) => item.format_type === 'series' || item.is_part_of_series);
      } else if (fmtLower === 'short' || fmtLower === 'shorts' || fmtLower === 'reels') {
        filtered = filtered.filter((item) => item.format_type === 'short');
      } else if (fmtLower === 'clip' || fmtLower === 'clips') {
        filtered = filtered.filter((item) => item.format_type === 'clip');
      } else if (fmtLower === 'audio') {
        filtered = filtered.filter((item) => {
          return item.platform === 'SoundCloud' || item.platform === 'Spotify' ||
            (item.available_qualities && item.available_qualities.some((q: string) => /audio/i.test(q)));
        });
      } else if (fmtLower === 'video') {
        filtered = filtered.filter((item) => item.platform !== 'SoundCloud');
      }
    }

    if (sortBy === 'views') {
      filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.upload_date || 0).getTime();
        const dateB = new Date(b.upload_date || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === 'duration_desc') {
      filtered.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    } else if (sortBy === 'duration_asc') {
      filtered.sort((a, b) => (a.duration_seconds || 0) - (b.duration_seconds || 0));
    }

    const startIdx = Math.max(0, Number(offset) || 0);
    const pagedResults = filtered.slice(startIdx, startIdx + Number(limit));
    const hasMore = filtered.length > startIdx + Number(limit);

    return res.json({
      query,
      total: filtered.length,
      offset: startIdx,
      limit: Number(limit),
      has_more: hasMore,
      results: pagedResults
    });
  }
}
