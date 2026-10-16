import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ScreenType } from './components/Sidebar';
import { HomeScreen } from './views/HomeScreen';
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
import { DownloadTask, DownloadHistory, AppSettings, SearchResult, VideoInfo } from './types';
import { loadSettings, saveSettings } from './controllers/settingsController';
import { loadHistory, saveHistory, addToHistory, removeFromHistory, clearAllHistory } from './controllers/historyController';

const QUEUE_STORAGE_KEY = 'klyp_active_queue_v1';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [history, setHistory] = useState<DownloadHistory[]>(loadHistory);

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

  // Download Loop Simulation & Progress Driver
  useEffect(() => {
    const timer = setInterval(() => {
      setQueue((prevQueue) => {
        const downloadingTasks = prevQueue.filter((t) => t.status === 'downloading');

        // Check if we should auto-start queued tasks according to sequential/parallel setting
        const maxConcurrent = settings.download_mode === 'parallel' ? settings.max_concurrent : 1;

        if (downloadingTasks.length < maxConcurrent) {
          const nextQueued = prevQueue.find((t) => t.status === 'queued');
          if (nextQueued) {
            // Auto-start next
            return prevQueue.map((t) =>
              t.id === nextQueued.id
                ? { ...t, status: 'downloading', speed: '3.5 MB/s', eta: '00:25' }
                : t
            );
          }
        }

        if (downloadingTasks.length === 0) return prevQueue;

        let hasCompletedAny = false;
        const updated = prevQueue.map((task) => {
          if (task.status !== 'downloading') return task;

          const step = Math.random() * 5 + 4; // 4-9% step per tick
          const nextProgress = Math.min(100, task.progress + step);
          const remainingSecs = Math.max(1, Math.round((100 - nextProgress) / 4));
          const eta = `00:${remainingSecs.toString().padStart(2, '0')}`;
          const currentSpeed = `${(Math.random() * 1.5 + 2.8).toFixed(1)} MB/s`;

          if (nextProgress >= 100) {
            hasCompletedAny = true;
            // Record completed in history
            const histItem: DownloadHistory = {
              id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              video_info: task.video_info,
              download_path: task.download_path,
              completed_at: new Date().toISOString(),
              file_size: Math.floor(Math.random() * 35000000 + 15000000),
              file_size_formatted: `${(Math.random() * 35 + 15).toFixed(1)} MB`,
              media_url: '/api/media/sample'
            };
            setHistory((prevH) => addToHistory(histItem));
            showToast(`✓ Completed download: "${task.video_info.title}"`);

            return {
              ...task,
              progress: 100,
              status: 'completed' as const,
              speed: '0 MB/s',
              eta: 'Done',
              completed_at: new Date().toISOString()
            };
          }

          return {
            ...task,
            progress: nextProgress,
            speed: currentSpeed,
            eta
          };
        });

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.download_mode, settings.max_concurrent]);

  // URL extraction & quality dialog trigger
  const handleAddUrlToQueue = async (url: string) => {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      throw new Error('Unable to extract media metadata');
    }
    const info: VideoInfo = await res.json();
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
  const handleAddEpisodesToQueue = (episodes: { title: string; episodeNumber: number; url: string; duration?: string }[]) => {
    const newTasks: DownloadTask[] = episodes.map((ep, idx) => ({
      id: `task-ep-${Date.now()}-${idx}`,
      video_info: {
        url: ep.url,
        title: ep.title,
        thumbnail: `https://picsum.photos/seed/ep${ep.episodeNumber}/480/270`,
        duration: ep.duration || '24:00',
        author: 'Series Channel',
        available_qualities: ['1080p', '720p'],
        selected_quality: '1080p',
        download_subtitles: true,
        platform: 'Streaming'
      },
      status: 'queued',
      progress: 0,
      download_path: `${settings.download_directory}/${ep.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
      created_at: new Date().toISOString()
    }));

    setQueue((prev) => [...prev, ...newTasks]);
    showToast(`Queued ${episodes.length} episodes!`);
  };

  // Queue Operations
  const handleStartAll = () => {
    setQueue((prev) =>
      prev.map((t) => (t.status === 'stopped' || t.status === 'queued' ? { ...t, status: 'queued' } : t))
    );
    showToast('Download queue started');
  };

  const handleStopAll = () => {
    setQueue((prev) =>
      prev.map((t) => (t.status === 'downloading' ? { ...t, status: 'stopped', speed: '0 MB/s' } : t))
    );
    showToast('All downloads paused');
  };

  const handleStartTask = (taskId: string) => {
    setQueue((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'downloading', speed: '3.2 MB/s' } : t))
    );
  };

  const handleStopTask = (taskId: string) => {
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
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-screen">
        {/* Toast alert */}
        {toastMessage && (
          <div className="fixed top-5 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-[#252526] border border-[#10b981] text-white shadow-2xl animate-fadeIn">
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

        {currentScreen === 'search' && (
          <SearchScreen
            onAddToQueue={handleSearchAddToQueue}
            onOpenCompare={(items) => setCompareDialog({ open: true, items })}
            onOpenSeries={(item) => setSeriesDialog({ open: true, item })}
            onPreviewMedia={(title, url, thumb) =>
              setMediaPlayer({ open: true, title, url, thumb })
            }
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
                url: '/api/media/sample',
                thumb: task.video_info.thumbnail
              })
            }
            downloadMode={settings.download_mode}
            maxConcurrent={settings.max_concurrent}
          />
        )}

        {currentScreen === 'subtitles' && <SubtitlesScreen />}

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
      />

      {/* Series Detection Dialog */}
      {seriesDialog.item && (
        <SeriesDialog
          isOpen={seriesDialog.open}
          item={seriesDialog.item}
          onClose={() => setSeriesDialog({ open: false, item: null })}
          onAddEpisodes={handleAddEpisodesToQueue}
        />
      )}

      {/* Platform Health Modal */}
      <PlatformHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />

      {/* Media Player Modal */}
      <MediaPlayerModal
        isOpen={mediaPlayer.open}
        onClose={() => setMediaPlayer({ open: false, title: '', url: '' })}
        mediaTitle={mediaPlayer.title}
        mediaUrl={mediaPlayer.url}
        thumbnailUrl={mediaPlayer.thumb}
      />
    </div>
  );
};
