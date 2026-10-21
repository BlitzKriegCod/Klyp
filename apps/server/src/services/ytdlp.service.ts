import { spawn, exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { DOWNLOADS_DIR } from '../config/env';
import { hasBinary } from '../config/binaries';
import { ScraperService } from './scraper.service';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];
let userAgentCursor = 0;

function getNextUserAgent(): string {
  const ua = USER_AGENTS[userAgentCursor % USER_AGENTS.length];
  userAgentCursor++;
  return ua;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function runYtDlpDump(url: string, userAgent: string, audioOnly = false): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--flat-playlist',
      '--socket-timeout', '14',
      '--user-agent', userAgent
    ];
    if (audioOnly) {
      args.push('-f', 'bestaudio/best');
    }
    args.push(url);

    const child = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    child.on('error', (err) => {
      resolve({ stdout: '', stderr: `Process error: ${err.message}`, code: -1 });
    });
  });
}

export interface DownloadOptions {
  taskId: string;
  url: string;
  quality?: string;
  format?: string;
  extractAudio?: boolean;
  audioFormat?: string;
  embedThumbnail?: boolean;
  embedMetadata?: boolean;
  sponsorblock?: boolean;
  subtitleDownload?: boolean;
  subLang?: string;
  proxy?: string;
  cookiesPath?: string;
}

export class YtDlpService {
  static async extractSingleUrl(url: string): Promise<any> {
    const platform = ScraperService.detectPlatform(url);
    const hasYtDlp = await hasBinary('yt-dlp');

    if (!hasYtDlp) {
      throw new Error('yt-dlp engine is not installed or available on this host');
    }

    // 1. First attempt with active user-agent
    let ua = getNextUserAgent();
    let result = await runYtDlpDump(url, ua, false);
    let isAudioFallback = false;

    // 2. Retry with alternate user-agent if initial run failed
    if (result.code !== 0 || !result.stdout.trim()) {
      const alternateUa = getNextUserAgent();
      const retryResult = await runYtDlpDump(url, alternateUa, false);
      if (retryResult.code === 0 && retryResult.stdout.trim()) {
        result = retryResult;
      } else {
        // 3. Fallback: Attempt audio-only resolution if video streams are blocked or throttled
        const audioResult = await runYtDlpDump(url, alternateUa, true);
        if (audioResult.code === 0 && audioResult.stdout.trim()) {
          result = audioResult;
          isAudioFallback = true;
        }
      }
    }

    if (result.code === 0 && result.stdout.trim()) {
      try {
        const lines = result.stdout.trim().split('\n').filter(Boolean);
        const firstLine = lines.find((l) => l.trim().startsWith('{')) || lines[0];
        const firstItem = JSON.parse(firstLine);

        const isPlaylist = lines.length > 1 || firstItem._type === 'playlist' || url.includes('playlist?list=');
        const title = firstItem.title || 'Untitled Media';
        const thumbnail = firstItem.thumbnails?.[firstItem.thumbnails.length - 1]?.url || firstItem.thumbnail || '';
        const author = firstItem.uploader || firstItem.channel || platform.name;
        const duration = firstItem.duration || 180;

        // Available qualities
        const qualities = ['1080p', '720p', '480p', '360p', 'Audio Only (MP3)'];
        if (firstItem.formats) {
          const hSet = new Set<string>();
          firstItem.formats.forEach((f: any) => {
            if (f.height) hSet.add(`${f.height}p`);
          });
          if (hSet.size > 0) {
            const sorted = Array.from(hSet).sort((a, b) => parseInt(b) - parseInt(a));
            qualities.splice(0, qualities.length, ...sorted, 'Audio Only (MP3)');
          }
        }

        const entries = lines.map((line, idx) => {
          try {
            if (!line.trim().startsWith('{')) return null;
            const item = JSON.parse(line);
            return {
              id: item.id || `item-${idx}`,
              title: item.title || `Item ${idx + 1}`,
              url: item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : url),
              duration: item.duration ? formatDuration(item.duration) : 'Unknown',
              author: item.uploader || author,
              thumbnail: item.thumbnails?.[0]?.url || item.thumbnail || thumbnail
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        return {
          url,
          title,
          thumbnail,
          duration,
          duration_formatted: formatDuration(duration),
          author,
          platform: platform.name,
          platform_category: platform.category,
          platform_icon: platform.icon,
          platform_color: platform.color,
          available_qualities: qualities,
          selected_quality: isAudioFallback ? 'Audio Only (MP3)' : qualities[0],
          download_subtitles: false,
          is_playlist: isPlaylist,
          playlist_count: isPlaylist ? entries.length : 1,
          entries: isPlaylist ? entries : undefined,
          is_audio_fallback: isAudioFallback,
          source: 'yt-dlp'
        };
      } catch (parseErr: any) {
        throw new Error(`Failed to parse metadata: ${parseErr.message}`);
      }
    }

    const cleanErr = result.stderr
      .split('\n')
      .filter((l) => !l.startsWith('Deprecated Feature:') && !l.startsWith('WARNING:'))
      .find((l) => l.includes('ERROR:')) || result.stderr || 'Extraction failed';
    throw new Error(cleanErr.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/i, '').trim());
  }

  static buildDownloadArgs(options: DownloadOptions, outputTemplate: string): string[] {
    const {
      url,
      quality = '1080p',
      format = 'mp4',
      extractAudio = false,
      audioFormat = 'mp3',
      embedThumbnail = true,
      embedMetadata = true,
      sponsorblock = false,
      subtitleDownload = false,
      subLang = 'en',
      proxy = '',
      cookiesPath = ''
    } = options;

    const args = [
      '--newline',
      '--progress',
      '--no-playlist',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-o', outputTemplate,
    ];

    if (url.includes('tiktok.com')) {
      args.push('--extractor-args', 'tiktok:api_hostname=api22-core-c-useast1a.tiktokv.com;app_version=20.2.1');
    } else if (url.includes('animeflv.net')) {
      args.push('--referer', 'https://www3.animeflv.net/');
    }

    const isAudioOnly = extractAudio || quality?.toLowerCase().includes('audio');
    if (isAudioOnly) {
      args.push('-x', '--audio-format', audioFormat || 'mp3');
    } else {
      const heightMatch = quality?.match(/(\d+)p/);
      if (heightMatch) {
        const maxH = heightMatch[1];
        args.push('-f', `bestvideo[height<=${maxH}]+bestaudio/best[height<=${maxH}]/best`);
      } else {
        args.push('-f', 'bestvideo+bestaudio/best');
      }
      args.push('--merge-output-format', format === 'mkv' ? 'mkv' : 'mp4');
    }

    if (embedMetadata) args.push('--embed-metadata');
    if (embedThumbnail) args.push('--embed-thumbnail');
    if (sponsorblock) args.push('--sponsorblock-remove', 'all');

    if (subtitleDownload) {
      args.push('--write-sub', '--sub-lang', subLang || 'en', '--embed-subs');
    }

    if (proxy && proxy.trim()) {
      args.push('--proxy', proxy.trim());
    }

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      args.push('--cookies', cookiesPath);
    }

    args.push(url);
    return args;
  }

  static runCommandWithTimeout(command: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
}
