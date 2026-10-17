import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ScreenType } from './components/Sidebar';
import { HomeScreen } from './views/HomeScreen';
import { MusicScreen } from './views/MusicScreen';
import { SearchScreen } from './views/SearchScreen';
import { QueueScreen } from './views/QueueScreen';
import { SubtitlesScreen } from './views/SubtitlesScreen';
import { HistoryScreen } from './views/HistoryScreen';
import { SettingsScreen } from './views/SettingsScreen';
import { QualityDialog } from './components/QualityDialog';
import { BatchCompareDialog } from './components/BatchCompareDialog';
import { SeriesDialog } from './components/SeriesDialog';
import { PlatformHealthModal } from './components/PlatformHealthModal';
import { MediaPlayerModal } from './components/MediaPlayerModal';
import { DownloadTask, DownloadHistory, AppSettings, SearchResult, VideoInfo, MusicTrack } from './types';
import { loadSettings, saveSettings } from './controllers/settingsController';
import { loadHistory, saveHistory, addToHistory, removeFromHistory, clearAllHistory } from './controllers/historyController';

const QUEUE_STORAGE_KEY = 'klyp_active_queue_v1';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [history, setHistory] = useState<DownloadHistory[]>(loadHistory);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('klyp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('klyp_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Queue state
  const [queue, setQueue] = useState<DownloadTask[]>(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'task-welcome-1',
        video_info: {
          url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
          title: 'synthwave radio 🌌 beats to chill/game to',
          thumbnail: 'https://picsum.photos/seed/synthwave1/480/270',
          duration: 3600,
          author: 'Lofi Girl',
          available_qualities: ['1080p', '720p', '480p', 'Audio Only (MP3)'],
          selected_quality: '1080p',
          download_subtitles: false,
          platform: 'YouTube'
        },
        status: 'queued',
        progress: 0,
        speed: '0 MB/s',
        eta: '--:--',
        download_path: '~/Downloads/Klyp/synthwave_radio.mp4',
        created_at: new Date().toISOString()
      }
    ];
  });

  // Modals state
  const [qualityDialog, setQualityDialog] = useState<{
    open: boolean;
    videoInfo: VideoInfo | null;
  }>({ open: false, videoInfo: null });

  const [compareDialog, setCompareDialog] = useState<{
    open: boolean;
    items: SearchResult[];
  }>({ open: false, items: [] });

  const [seriesDialog, setSeriesDialog] = useState<{
    open: boolean;
    item: SearchResult | null;
  }>({ open: false, item: null });

  const [healthModalOpen, setHealthModalOpen] = useState<boolean>(false);

  const [mediaPlayer, setMediaPlayer] = useState<{
    open: boolean;
    title: string;
    url: string;
    thumb?: string;
  }>({ open: false, title: '', url: '' });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {}
  }, [queue]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to trigger server-side yt-dlp execution
  const startServerDownload = async (task: DownloadTask) => {
    // If it's a music task, it is already handled by the music batch engine
    if (task.is_music || task.video_info.is_music) {
      return;
    }

    try {
      const isAudio = task.video_info.selected_quality?.toLowerCase().includes('audio') || settings.extract_audio;
      const formatMatch = task.video_info.selected_quality?.match(/audio\s*\(([^)]+)\)/i);
      const audioFmt = formatMatch ? formatMatch[1].toLowerCase() : settings.audio_format;

      await fetch('/api/download/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          url: task.video_info.url,
          quality: task.video_info.selected_quality,
          extractAudio: isAudio,
          audioFormat: audioFmt || 'mp3',
          embedThumbnail: settings.embed_thumbnail,
          embedMetadata: settings.embed_metadata,
          sponsorblock: settings.sponsorblock_enabled,
          subtitleDownload: task.video_info.download_subtitles || settings.subtitle_download,
          proxy: settings.proxy_enabled ? `${settings.proxy_type}://${settings.proxy_host}:${settings.proxy_port}` : ''
        })
      });
    } catch (e) {
      console.error('[Klyp] Error starting server download:', e);
    }
  };

  // Helper for batch queuing music tracks with embedded tags and album art
  const handleQueueBatchMusicTracks = async (
    tracks: MusicTrack[],
    format: 'mp3' | 'flac',
    quality: '320kbps' | 'lossless'
  ) => {
    try {
      const res = await fetch('/api/music/download/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          quality,
          tracks: tracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            trackNumber: t.trackNumber,
            totalTracks: t.totalTracks,
            releaseYear: t.releaseDate ? new Date(t.releaseDate).getFullYear() : 2024,
            genre: t.genre,
            artworkUrl: t.artworkUrl,
            durationMs: t.durationMs,
            previewUrl: t.previewUrl
          }))
        })
      });

      if (!res.ok) throw new Error('Failed to dispatch music batch');
      const data = await res.json();
      const serverTasks: Array<{ taskId: string; title: string; artist: string; album: string; fileName: string }> = data.tasks || [];

      const newTasks: DownloadTask[] = serverTasks.map((st, idx) => {
        const origTrack = tracks[idx] || tracks.find((t) => t.title === st.title);
        return {
          id: st.taskId,
          video_info: {
            url: origTrack?.previewUrl || `music://${encodeURIComponent(st.artist)}/${encodeURIComponent(st.title)}`,
            title: `${st.artist} - ${st.title}`,
            thumbnail: origTrack?.artworkUrl || '',
            duration: origTrack?.durationFormatted || '03:30',
            duration_formatted: origTrack?.durationFormatted || '03:30',
            author: st.artist,
            available_qualities: [`Audio (${format.toUpperCase()} ${quality})`],
            selected_quality: `Audio (${format.toUpperCase()} ${quality})`,
            download_subtitles: false,
            platform: 'iTunes Music',
            format: format,
            is_music: true,
            album: st.album,
            artist: st.artist,
            track_number: origTrack?.trackNumber,
            total_tracks: origTrack?.totalTracks,
            release_year: origTrack?.releaseDate ? new Date(origTrack.releaseDate).getFullYear() : 2024,
            genre: origTrack?.genre,
            audio_format: format
          },
          status: 'downloading',
          progress: 20,
          speed: 'Encoding & Tagging...',
          eta: '--:--',
          download_path: `${settings.download_directory}/Music/${st.artist}/${st.album}`,
          created_at: new Date().toISOString(),
          is_music: true
        };
      });

      setQueue((prev) => [...newTasks, ...prev]);
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch music batch');
    }
  };

  // Helper to cancel server process
  const cancelServerDownload = async (taskId: string) => {
    try {
      await fetch('/api/download/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
    } catch (e) {
      console.error('[Klyp] Error cancelling server download:', e);
    }
  };

  // Real Download Engine Status Polling & Queue Scheduler
  useEffect(() => {
    const timer = setInterval(async () => {
      // 1. Check active downloading tasks
      const downloading = queue.filter((t) => t.status === 'downloading');

      // Auto-start queued tasks according to sequential or parallel mode
      const maxConcurrent = settings.download_mode === 'parallel' ? settings.max_concurrent : 1;
      if (downloading.length < maxConcurrent) {
        const nextQueued = queue.find((t) => t.status === 'queued');
        if (nextQueued) {
          startServerDownload(nextQueued);
          setQueue((prev) =>
            prev.map((t) =>
              t.id === nextQueued.id
                ? { ...t, status: 'downloading', speed: 'Starting...', eta: '--:--' }
                : t
            )
          );
          return;
        }
      }

      if (downloading.length === 0) return;

      // 2. Poll server for real yt-dlp progress
      for (const task of downloading) {
        try {
          const res = await fetch(`/api/download/status/${task.id}`);
          if (res.ok) {
            const data = await res.json();

            setQueue((prev) =>
              prev.map((t) => {
                if (t.id !== task.id) return t;

                if (data.status === 'completed') {
                  const fileSize = data.fileSize || 15000000;
                  const fileSizeFormatted = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;

                  // Save into history
                  const histItem: DownloadHistory = {
                    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    video_info: t.video_info,
                    download_path: t.download_path,
                    completed_at: new Date().toISOString(),
                    file_size: fileSize,
                    file_size_formatted: fileSizeFormatted,
                    media_url: data.outputFileUrl || '/api/media/sample'
                  };
                  setHistory((prevH) => addToHistory(histItem));
                  showToast(`✓ Completed download: "${t.video_info.title}"`);

                  return {
                    ...t,
                    status: 'completed',
                    progress: 100,
                    speed: 'Finished',
                    eta: '00:00',
                    output_file_url: data.outputFileUrl,
                    download_url: data.downloadUrl,
                    completed_at: new Date().toISOString()
                  };
                }

                if (data.status === 'failed') {
                  showToast(`✗ Download failed: "${t.video_info.title}"`);
                  return {
                    ...t,
                    status: 'failed',
                    speed: '0 MB/s',
                    error_message: data.errorMessage || 'Download error'
                  };
                }

                if (data.status === 'stopped') {
                  return {
                    ...t,
                    status: 'stopped',
                    speed: '0 MB/s'
                  };
                }

                // Still downloading
                return {
                  ...t,
                  progress: typeof data.progress === 'number' ? data.progress : t.progress,
                  speed: data.speed || t.speed,
                  eta: data.eta || t.eta
                };
              })
            );
          }
        } catch (e) {
          console.error('[Klyp] Error polling download status:', e);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [queue, settings]);

  // URL extraction & quality / series dialog trigger
  const handleAddUrlToQueue = async (url: string) => {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Unable to extract media metadata');
    }
    const info: VideoInfo = await res.json();

    // If it's a playlist or series with multiple entries, open the series / playlist selector
    if (info.is_playlist && info.entries && info.entries.length > 1) {
      setSeriesDialog({
        open: true,
        item: {
          id: info.url,
          url: info.url,
          title: info.title,
          author: info.author,
          duration: info.duration_formatted || String(info.duration) || 'Unknown',
          thumbnail: info.thumbnail || '',
          platform: info.platform || 'Streaming',
          platform_category: 'Playlist',
          platform_icon: '📑',
          platform_color: '#10b981',
          available_qualities: info.available_qualities,
          is_part_of_series: true,
          series_name: info.title,
          entries: info.entries
        }
      });
      return;
    }

    setQualityDialog({ open: true, videoInfo: info });
  };

  const handleConfirmAddQueue = (
    quality: string,
    downloadSubs: boolean,
    audioFormat?: string
  ) => {
    if (!qualityDialog.videoInfo) return;
    const info = qualityDialog.videoInfo;
    const cleanQuality = audioFormat ? `Audio (${audioFormat.toUpperCase()})` : quality;

    const newTask: DownloadTask = {
      id: `task-${Date.now()}`,
      video_info: {
        ...info,
        selected_quality: cleanQuality,
        download_subtitles: downloadSubs
      },
      status: 'queued',
      progress: 0,
      download_path: `${settings.download_directory}/${info.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${audioFormat || 'mp4'}`,
      created_at: new Date().toISOString()
    };

    setQueue((prev) => [newTask, ...prev]);
    showToast(`Added "${info.title}" to queue (${cleanQuality})`);
  };

  // From Search Screen
  const handleSearchAddToQueue = (item: SearchResult) => {
    const videoInfo: VideoInfo = {
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      duration: item.duration,
      author: item.author,
      available_qualities: item.available_qualities || ['1080p', '720p', 'Audio Only (MP3)'],
      selected_quality: '1080p',
      download_subtitles: false,
      platform: item.platform
    };
    setQualityDialog({ open: true, videoInfo });
  };

  // From Series Dialog
  const handleAddEpisodesToQueue = (episodes: { title: string; episodeNumber: number; url: string; duration?: string; thumbnail?: string; author?: string }[]) => {
    const newTasks: DownloadTask[] = episodes.map((ep, idx) => ({
      id: `task-ep-${Date.now()}-${idx}`,
      video_info: {
        url: ep.url,
        title: ep.title,
        thumbnail: ep.thumbnail || '',
        duration: ep.duration || 'Unknown',
        author: ep.author || 'Series Channel',
        available_qualities: ['1080p', '720p', 'Audio Only (MP3)'],
        selected_quality: '1080p',
        download_subtitles: false,
        platform: 'Streaming'
      },
      status: 'queued',
      progress: 0,
      download_path: `${settings.download_directory}/${ep.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
      created_at: new Date().toISOString()
    }));

    setQueue((prev) => [...prev, ...newTasks]);
    showToast(`Queued ${episodes.length} items to download!`);
  };

  // Queue Operations
  const handleStartAll = () => {
    setQueue((prev) =>
      prev.map((t) => (t.status === 'stopped' || t.status === 'queued' ? { ...t, status: 'queued' } : t))
    );
    showToast('Download queue started');
  };

  const handleStopAll = () => {
    queue.filter((t) => t.status === 'downloading').forEach((t) => cancelServerDownload(t.id));
    setQueue((prev) =>
      prev.map((t) => (t.status === 'downloading' ? { ...t, status: 'stopped', speed: '0 MB/s' } : t))
    );
    showToast('All downloads paused');
  };

  const handleStartTask = (taskId: string) => {
    const task = queue.find((t) => t.id === taskId);
    if (task) {
      startServerDownload(task);
      setQueue((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'downloading', speed: 'Starting...' } : t))
      );
    }
  };

  const handleStopTask = (taskId: string) => {
    cancelServerDownload(taskId);
    setQueue((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'stopped', speed: '0 MB/s' } : t))
    );
  };

  const handleRemoveTask = (taskId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleClearQueue = () => {
    if (confirm('Clear all tasks from the download queue?')) {
      setQueue([]);
    }
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((t) => t.status !== 'completed'));
  };

  const handleImportQueue = (imported: DownloadTask[]) => {
    setQueue((prev) => [...imported, ...prev]);
    showToast(`Imported ${imported.length} tasks into queue`);
  };

  const handleExportQueue = () => {
    const blob = new Blob([JSON.stringify(queue, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klyp_queue_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const activeDownloadsCount = queue.filter((t) => t.status === 'downloading').length;

  return (
    <div
      className={`min-h-screen flex text-[#d4d4d4] transition-colors duration-200 ${
        settings.theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        queueCount={queue.length}
        activeDownloadsCount={activeDownloadsCount}
        theme={settings.theme}
        onToggleTheme={() => {
          const next = settings.theme === 'dark' ? 'light' : 'dark';
          setSettings((s) => ({ ...s, theme: next }));
          saveSettings({ ...settings, theme: next });
        }}
        onOpenHealth={() => setHealthModalOpen(true)}
        downloadDir={settings.download_directory}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-screen">
        {/* Toast alert */}
        {toastMessage && (
          <div className={`fixed top-5 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-2xl animate-fadeIn ${
            settings.theme === 'dark'
              ? 'bg-[#252526] border-[#10b981] text-white'
              : 'bg-white border-[#10b981] text-slate-900 shadow-xl'
          }`}>
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={setCurrentScreen}
            queue={queue}
            onAddUrlToQueue={handleAddUrlToQueue}
            theme={settings.theme}
          />
        )}

        {currentScreen === 'music' && (
          <MusicScreen
            theme={settings.theme}
            onQueueBatchTracks={handleQueueBatchMusicTracks}
            showToast={showToast}
          />
        )}

        {currentScreen === 'search' && (
          <SearchScreen
            onAddToQueue={handleSearchAddToQueue}
            onOpenCompare={(items) => setCompareDialog({ open: true, items })}
            onOpenSeries={(item) => setSeriesDialog({ open: true, item })}
            onPreviewMedia={(title, url, thumb) =>
              setMediaPlayer({ open: true, title, url, thumb })
            }
            theme={settings.theme}
          />
        )}

        {currentScreen === 'queue' && (
          <QueueScreen
            queue={queue}
            onStartAll={handleStartAll}
            onStopAll={handleStopAll}
            onStartTask={handleStartTask}
            onStopTask={handleStopTask}
            onRemoveTask={handleRemoveTask}
            onClearQueue={handleClearQueue}
            onClearCompleted={handleClearCompleted}
            onImportQueue={handleImportQueue}
            onExportQueue={handleExportQueue}
            onPreviewTask={(task) =>
              setMediaPlayer({
                open: true,
                title: task.video_info.title,
                url: task.output_file_url || '/api/media/sample',
                thumb: task.video_info.thumbnail
              })
            }
            downloadMode={settings.download_mode}
            maxConcurrent={settings.max_concurrent}
            theme={settings.theme}
          />
        )}

        {currentScreen === 'subtitles' && <SubtitlesScreen theme={settings.theme} settings={settings} />}

        {currentScreen === 'history' && (
          <HistoryScreen
            history={history}
            onClearHistory={() => {
              if (confirm('Clear all downloaded history records?')) {
                clearAllHistory();
                setHistory([]);
              }
            }}
            onRemoveHistoryItem={(id) => setHistory(removeFromHistory(id))}
            onRequeue={(videoInfo) => {
              setQualityDialog({ open: true, videoInfo });
            }}
            onPlayMedia={(title, url, thumb) =>
              setMediaPlayer({ open: true, title, url, thumb })
            }
            theme={settings.theme}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSaveSettings={handleSaveSettings}
            theme={settings.theme}
            onToggleTheme={() => {
              const next = settings.theme === 'dark' ? 'light' : 'dark';
              setSettings((s) => ({ ...s, theme: next }));
              saveSettings({ ...settings, theme: next });
            }}
          />
        )}
      </main>

      {/* Quality Selection Modal */}
      {qualityDialog.videoInfo && (
        <QualityDialog
          isOpen={qualityDialog.open}
          videoInfo={qualityDialog.videoInfo}
          onClose={() => setQualityDialog({ open: false, videoInfo: null })}
          onConfirm={handleConfirmAddQueue}
          theme={settings.theme}
        />
      )}

      {/* Side-by-Side Batch Compare Dialog */}
      <BatchCompareDialog
        isOpen={compareDialog.open}
        items={compareDialog.items}
        onClose={() => setCompareDialog({ open: false, items: [] })}
        onAddToQueue={(item) => {
          handleSearchAddToQueue(item);
        }}
        theme={settings.theme}
      />

      {/* Series Detection Dialog */}
      {seriesDialog.item && (
        <SeriesDialog
          isOpen={seriesDialog.open}
          item={seriesDialog.item}
          onClose={() => setSeriesDialog({ open: false, item: null })}
          onAddEpisodes={handleAddEpisodesToQueue}
          theme={settings.theme}
        />
      )}

      {/* Platform Health Modal */}
      <PlatformHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        theme={settings.theme}
      />

      {/* Media Player Modal */}
      <MediaPlayerModal
        isOpen={mediaPlayer.open}
        onClose={() => setMediaPlayer({ open: false, title: '', url: '' })}
        mediaTitle={mediaPlayer.title}
        mediaUrl={mediaPlayer.url}
        thumbnailUrl={mediaPlayer.thumb}
        theme={settings.theme}
      />
    </div>
  );
};
