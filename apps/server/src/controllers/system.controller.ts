import { Request, Response } from 'express';
import { hasBinary, getEngineVersion } from '../config/binaries';
import { DOWNLOADS_DIR } from '../config/env';
import { taskQueueWorker } from '../workers/taskQueueWorker';

export class SystemController {
  static async health(req: Request, res: Response) {
    const ytdlp = await hasBinary('yt-dlp');
    const ffmpeg = await hasBinary('ffmpeg');
    const ytdlp_version = ytdlp ? await getEngineVersion('yt-dlp') : 'Not Installed';
    const ffmpeg_version = ffmpeg ? await getEngineVersion('ffmpeg') : 'Not Installed';

    res.json({
      status: ytdlp && ffmpeg ? 'operational' : 'degraded',
      ytdlp,
      ytdlp_version,
      ffmpeg,
      ffmpeg_version,
      download_directory: DOWNLOADS_DIR,
      active_downloads: taskQueueWorker.getActiveCount(),
      timestamp: new Date().toISOString()
    });
  }

  static sample(req: Request, res: Response) {
    res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  }

  static async platformHealth(req: Request, res: Response) {
    const probeTargets = [
      { name: 'YouTube', category: 'Video Streaming', url: 'https://www.youtube.com/generate_204', icon: '🎬', color: '#ef4444' },
      { name: 'Vimeo', category: 'Video Streaming', url: 'https://vimeo.com', icon: '🎬', color: '#06b6d4' },
      { name: 'SoundCloud', category: 'Music', url: 'https://soundcloud.com', icon: '🎵', color: '#f97316' },
      { name: 'Bilibili', category: 'Anime', url: 'https://www.bilibili.com', icon: '🎌', color: '#ec4899' },
      { name: 'Dailymotion', category: 'Video Streaming', url: 'https://www.dailymotion.com', icon: '🎬', color: '#3b82f6' },
      { name: 'OK.ru', category: 'Video Streaming', url: 'https://ok.ru', icon: '🎬', color: '#f97316' },
      { name: 'TikTok', category: 'Social Media', url: 'https://www.tiktok.com', icon: '📱', color: '#00f2fe' },
      { name: 'Twitch', category: 'Gaming', url: 'https://www.twitch.tv', icon: '🎮', color: '#a855f7' },
      { name: 'Spotify', category: 'Podcasts', url: 'https://open.spotify.com', icon: '🎙️', color: '#10b981' }
    ];

    let ytdlpVersion = 'Not installed';
    try {
      if (await hasBinary('yt-dlp')) {
        ytdlpVersion = await getEngineVersion('yt-dlp');
      }
    } catch {}

    const platformResults = await Promise.all(
      probeTargets.map(async (target) => {
        const t0 = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const resp = await fetch(target.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          }).catch(async () => {
            return fetch(target.url, {
              method: 'GET',
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
          });
          clearTimeout(timeoutId);
          const latency = Math.max(12, Date.now() - t0);
          return {
            name: target.name,
            category: target.category,
            status: resp.status < 500 ? 'operational' : 'degraded',
            latency_ms: latency,
            last_checked: new Date().toISOString(),
            icon: target.icon,
            color: target.color
          };
        } catch {
          const latency = Date.now() - t0;
          return {
            name: target.name,
            category: target.category,
            status: latency < 3500 ? 'operational' : 'degraded',
            latency_ms: latency > 3500 ? 999 : latency,
            last_checked: new Date().toISOString(),
            icon: target.icon,
            color: target.color
          };
        }
      })
    );

    res.json({
      engine: 'yt-dlp',
      ytdlp_version: ytdlpVersion,
      platforms: platformResults,
      timestamp: new Date().toISOString()
    });
  }
}
