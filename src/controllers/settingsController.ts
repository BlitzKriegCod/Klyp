import { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  download_directory: '~/Downloads/Klyp',
  theme: 'dark',
  download_mode: 'sequential',
  max_concurrent: 3,
  proxy_enabled: false,
  proxy_host: '',
  proxy_port: '',
  proxy_type: 'http',
  subtitle_download: false,
  notifications_enabled: true,
  auto_resume: true,
  extract_audio: false,
  audio_format: 'mp3',
  embed_thumbnail: false,
  embed_metadata: false,
  sponsorblock_enabled: false,
  cookies_path: '',
  os_username: '',
  os_password: '',
  os_api_key: 'FNyoC96mlztsk3ALgNdhfSNapfFY9lOi',
  search_enable_enrichment: true,
  search_enable_quality_filter: true,
  search_enable_recommendations: true,
  search_cache_ttl: 3600,
  search_max_parallel_enrichment: 5,
  search_show_platform_health: true,
  debug_thread_safety: false,
};

const STORAGE_KEY = 'klyp_settings_v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
