import { DownloadHistory, VideoInfo } from '../types';

const STORAGE_KEY = 'klyp_download_history_v1';

export function loadHistory(): DownloadHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load history:', e);
  }
  return [
    {
      id: 'hist-demo-1',
      video_info: {
        url: 'https://youtube.com/watch?v=sample1',
        title: 'Cyberpunk Ambient Chillout Synth - Sunset Drive',
        thumbnail: 'https://picsum.photos/seed/synthwave/480/270',
        duration: 340,
        author: 'Neon Pulse Records',
        available_qualities: ['1080p', '720p', 'Audio Only'],
        selected_quality: '1080p',
        download_subtitles: true,
        platform: 'YouTube'
      },
      download_path: '~/Downloads/Klyp/Cyberpunk_Ambient_Chillout_1080p.mp4',
      completed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      file_size: 48500000,
      file_size_formatted: '46.2 MB',
      media_url: '/api/media/sample'
    },
    {
      id: 'hist-demo-2',
      video_info: {
        url: 'https://soundcloud.com/artist/lofi-session',
        title: 'Deep Focus Chill Beats [High Fidelity Audio]',
        thumbnail: 'https://picsum.photos/seed/soundbeats/480/270',
        duration: 215,
        author: 'Lofi Collective',
        available_qualities: ['Audio Only (MP3 320kbps)'],
        selected_quality: 'Audio Only (MP3 320kbps)',
        download_subtitles: false,
        platform: 'SoundCloud'
      },
      download_path: '~/Downloads/Klyp/Deep_Focus_Chill_Beats.mp3',
      completed_at: new Date(Date.now() - 86400000).toISOString(),
      file_size: 8900000,
      file_size_formatted: '8.5 MB',
      media_url: '/api/media/sample'
    }
  ];
}

export function saveHistory(history: DownloadHistory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export function addToHistory(item: DownloadHistory): DownloadHistory[] {
  const current = loadHistory();
  const updated = [item, ...current.filter(h => h.id !== item.id)];
  saveHistory(updated);
  return updated;
}

export function removeFromHistory(id: string): DownloadHistory[] {
  const current = loadHistory();
  const updated = current.filter(h => h.id !== id);
  saveHistory(updated);
  return updated;
}

export function clearAllHistory(): void {
  saveHistory([]);
}
