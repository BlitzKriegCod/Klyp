/**
 * Data models for Klyp Video Downloader
 * Faithful TypeScript translation of models/data_models.py
 */

export * from './music';
import type { MusicTrack } from './music';

export type DownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed' | 'stopped';

export interface VideoInfo {
  url: string;
  title: string;
  thumbnail: string;
  duration: number | string; // seconds or formatted string
  duration_formatted?: string;
  author: string;
  available_qualities: string[];
  selected_quality: string;
  filename?: string;
  download_subtitles: boolean;
  platform?: string;
  is_playlist?: boolean;
  playlist_count?: number;
  entries?: any[];
  format?: string;
  // Music-specific metadata
  is_music?: boolean;
  music_track?: MusicTrack;
  album?: string;
  artist?: string;
  track_number?: number;
  total_tracks?: number;
  release_year?: number;
  genre?: string;
  audio_format?: 'mp3' | 'flac' | 'aac' | 'opus';
  artwork_url?: string;
}

export interface DownloadTask {
  id: string;
  video_info: VideoInfo;
  status: DownloadStatus;
  progress: number; // 0 to 100
  speed?: string; // e.g. "3.2 MB/s"
  eta?: string; // e.g. "00:45"
  download_path: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  downloaded_bytes?: number;
  total_bytes?: number;
  output_file_url?: string;
  download_url?: string;
  is_music?: boolean;
}

export interface DownloadHistory {
  id: string;
  video_info: VideoInfo;
  download_path: string;
  completed_at: string;
  file_size: number; // in bytes
  file_size_formatted?: string;
  media_url?: string;
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  author: string;
  duration: string;
  thumbnail: string;
  platform: string;
  platform_category: string;
  platform_icon: string;
  platform_color: string;
  
  // Enriched metadata fields
  view_count?: number;
  like_count?: number;
  upload_date?: string;
  description?: string;
  tags?: string[];
  available_qualities?: string[];
  
  // Enrichment status
  enrichment_failed?: boolean;
  
  // Series detection fields
  is_part_of_series?: boolean;
  series_name?: string;
  episode_number?: number;
  entries?: any[];
}

export interface SubtitleItem {
  id: string;
  file_name: string;
  movie_name: string;
  language: string;
  language_code: string;
  format: string;
  download_count: number;
  rating: number;
  hearing_impaired: boolean;
  download_url?: string;
  srt_content?: string;
}

export interface AppSettings {
  download_directory: string;
  theme: 'dark' | 'light';
  download_mode: 'sequential' | 'parallel';
  max_concurrent: number;
  proxy_enabled: boolean;
  proxy_host: string;
  proxy_port: string;
  proxy_type: 'http' | 'https' | 'socks5';
  subtitle_download: boolean;
  notifications_enabled: boolean;
  auto_resume: boolean;
  // Advanced yt-dlp settings
  extract_audio: boolean;
  audio_format: 'mp3' | 'aac' | 'flac' | 'opus' | 'wav' | 'm4a';
  embed_thumbnail: boolean;
  embed_metadata: boolean;
  sponsorblock_enabled: boolean;
  cookies_path: string;
  // OpenSubtitles settings
  os_username: string;
  os_password: string;
  os_api_key: string;
  // Search enhancement settings
  search_enable_enrichment: boolean;
  search_enable_quality_filter: boolean;
  search_enable_recommendations: boolean;
  search_cache_ttl: number;
  search_max_parallel_enrichment: number;
  search_show_platform_health: boolean;
  debug_thread_safety: boolean;
}

export interface PlatformHealth {
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'offline';
  latency_ms: number;
  last_checked: string;
  icon: string;
  color: string;
}
