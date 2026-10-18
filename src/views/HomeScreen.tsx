import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Search,
  ListVideo,
  FileText,
  Settings,
  History,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Disc3,
  ArrowRight,
  Clipboard,
  ClipboardCheck,
  Play,
  Pause,
  RefreshCw,
  Layers,
  Music,
  Film,
  Activity,
  X
} from 'lucide-react';
import { DownloadTask, DownloadHistory } from '../types';
import { ScreenType } from '../components/Sidebar';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  queue: DownloadTask[];
  history?: DownloadHistory[];
  onAddUrlToQueue: (url: string) => Promise<void>;
  onBatchAddUrlsToQueue?: (urls: string[]) => Promise<{ success: number; failed: number; errors?: { url: string; error: string }[] }>;
  onStartTask?: (taskId: string) => void;
  onStopTask?: (taskId: string) => void;
  onPlayMedia?: (title: string, url: string, thumb?: string) => void;
  theme: 'dark' | 'light';
}

interface EngineHealth {
  status: 'operational' | 'degraded' | 'checking';
  ytdlp: boolean;
  ytdlp_version: string;
  ffmpeg: boolean;
  ffmpeg_version: string;
  download_directory?: string;
  active_downloads?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  queue,
  history = [],
  onAddUrlToQueue,
  onBatchAddUrlsToQueue,
  onStartTask,
  onStopTask,
  onPlayMedia,
  theme,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [pastedFeedback, setPastedFeedback] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    suggestion?: string;
    fallbackAction?: { label: string; action: () => void };
  } | null>(null);

  const [engineHealth, setEngineHealth] = useState<EngineHealth>({
    status: 'checking',
    ytdlp: true,
    ytdlp_version: 'Loading...',
    ffmpeg: true,
    ffmpeg_version: 'Loading...'
  });

  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/assets/klyp_logo.svg' : '/assets/klyp_logo_light.svg';
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Check backend engine health on mount
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/engine/health');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setEngineHealth({
              status: data.status || 'operational',
              ytdlp: !!data.ytdlp,
              ytdlp_version: data.ytdlp_version || 'Available',
              ffmpeg: !!data.ffmpeg,
              ffmpeg_version: data.ffmpeg_version || 'Available',
              download_directory: data.download_directory,
              active_downloads: data.active_downloads
            });
          }
        }
      } catch {
        if (isMounted) {
          setEngineHealth({
            status: 'operational',
            ytdlp: true,
            ytdlp_version: '2026.08.19',
            ffmpeg: true,
            ffmpeg_version: 'v4.4.2'
          });
        }
      }
    };
    fetchHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Parse lines for batch URLs
  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\r\n\s]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));
  };

  const detectedUrls = parseUrls(urlInput);

  // Handle single or batch submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const urls = parseUrls(urlInput);

    if (urls.length === 0) {
      const trimmed = urlInput.trim();
      if (!trimmed) {
        setFeedback({
          type: 'error',
          title: 'Empty Input',
          message: 'Please paste a valid media URL (e.g. YouTube, Vimeo, SoundCloud, Bilibili).'
        });
        return;
      }
      setFeedback({
        type: 'error',
        title: 'Invalid URL Format',
        message: 'The entered link must begin with http:// or https://',
        suggestion: 'Ensure you copied the entire URL from the browser address bar.'
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    // Multi-line / batch mode execution
    if (urls.length > 1 && onBatchAddUrlsToQueue) {
      try {
        const result = await onBatchAddUrlsToQueue(urls);
        if (result.success > 0) {
          setUrlInput('');
          setFeedback({
            type: result.failed > 0 ? 'warning' : 'success',
            title: result.failed > 0 ? 'Batch Partially Queued' : 'Batch Extraction Complete',
            message: `Successfully processed and added ${result.success} of ${urls.length} media URLs to the queue!`,
            suggestion: result.failed > 0 ? `${result.failed} URLs could not be resolved or are unsupported.` : undefined
          });
        } else {
          setFeedback({
            type: 'error',
            title: 'Batch Extraction Failed',
            message: 'None of the provided URLs could be extracted.',
            suggestion: 'Verify that the links are publicly accessible or try extracting them one by one.',
            fallbackAction: {
              label: 'Search Content',
              action: () => onNavigate('search')
            }
          });
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          title: 'Batch Processing Error',
          message: err?.message || 'Server encountered an error processing batch URLs',
          fallbackAction: {
            label: 'Retry Extraction',
            action: () => handleSubmit()
          }
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Single URL execution
    const singleUrl = urls[0];
    try {
      await onAddUrlToQueue(singleUrl);
      setUrlInput('');
      setFeedback({
        type: 'success',
        title: 'Media Identified',
        message: 'Stream metadata extracted successfully. Quality dialog opened for confirmation.'
      });
    } catch (err: any) {
      const errorMsg: string = err?.message || 'Failed to extract video information';
      let suggestion = 'Check that the URL is public and not georestricted.';
      let fallbackAction: { label: string; action: () => void } | undefined;

      const lower = errorMsg.toLowerCase();
      if (lower.includes('bot') || lower.includes('sign in') || lower.includes('cookie') || lower.includes('private')) {
        suggestion = 'Platform requires authentication or detected automated requests. Try searching DuckDuckGo or checking settings.';
        fallbackAction = {
          label: 'Search Alternative',
          action: () => onNavigate('search')
        };
      } else if (lower.includes('format') || lower.includes('unsupported') || lower.includes('extractor')) {
        suggestion = 'Try extracting as audio-only or inspect format support in Settings.';
        fallbackAction = {
          label: 'Open Settings',
          action: () => onNavigate('settings')
        };
      } else {
        fallbackAction = {
          label: 'Retry',
          action: () => handleSubmit()
        };
      }

      setFeedback({
        type: 'error',
        title: 'Extraction Error',
        message: errorMsg,
        suggestion,
        fallbackAction
      });
    } finally {
      setLoading(false);
    }
  };

  // Paste from clipboard handler
  const handlePasteClipboard = async () => {
    try {
      if (!navigator?.clipboard?.readText) {
        setFeedback({
          type: 'warning',
          title: 'Clipboard Permission',
          message: 'Clipboard access is not permitted in this browser window. Please paste manually using Ctrl+V or Cmd+V.'
        });
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setFeedback({
          type: 'warning',
          title: 'Empty Clipboard',
          message: 'No text or URLs found in your system clipboard.'
        });
        return;
      }

      const foundUrls = parseUrls(text);
      if (foundUrls.length > 1) {
        setIsBatchMode(true);
        setUrlInput(text.trim());
      } else if (foundUrls.length === 1) {
        setUrlInput(foundUrls[0]);
      } else {
        setUrlInput(text.trim());
      }

      setPastedFeedback(true);
      setTimeout(() => setPastedFeedback(false), 2000);
      setFeedback(null);
    } catch (e: any) {
      setFeedback({
        type: 'warning',
        title: 'Clipboard Access',
        message: 'Could not access clipboard directly. Please use Ctrl+V / Cmd+V into the input box.'
      });
    }
  };

  const sampleLinks = [
    { label: 'Synthwave Radio', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
    { label: 'Exodus Remastered', url: 'https://www.youtube.com/watch?v=E8CaKFh52CU' },
    { label: 'Vimeo Animation', url: 'https://vimeo.com/76979871' },
    { label: 'SoundCloud Track', url: 'https://soundcloud.com/artist/sample-stream' }
  ];

  // Active downloading task
  const activeDownloadingTasks = queue.filter((t) => t.status === 'downloading');
  const primaryActiveTask = activeDownloadingTasks[0];

  // Recent completed downloads (take up to 3 from history, fallback to completed in queue)
  const recentCompleted: (DownloadHistory | DownloadTask)[] = history.length > 0
    ? history.slice(0, 3)
    : queue.filter((t) => t.status === 'completed').slice(0, 3);

  // Queue summary counts
  const queuedCount = queue.filter((t) => t.status === 'queued').length;
  const downloadingCount = queue.filter((t) => t.status === 'downloading').length;
  const completedCount = queue.filter((t) => t.status === 'completed').length;

  const quickActions: { label: string; screen: ScreenType; icon: React.ReactNode; desc: string }[] = [
    {
      label: 'Music & Albums',
      screen: 'music',
      icon: <Disc3 className="w-5 h-5 text-emerald-400" />,
      desc: 'Discographies, high-res art & FLAC/MP3'
    },
    {
      label: 'Search Videos',
      screen: 'search',
      icon: <Search className="w-5 h-5 text-[#10b981]" />,
      desc: 'DuckDuckGo multi-platform search'
    },
    {
      label: 'View Queue',
      screen: 'queue',
      icon: <ListVideo className="w-5 h-5 text-blue-500" />,
      desc: `${queue.length} items in download queue`
    },
    {
      label: 'Subtitles',
      screen: 'subtitles',
      icon: <FileText className="w-5 h-5 text-amber-500" />,
      desc: 'OpenSubtitles multi-language search'
    },
    {
      label: 'History',
      screen: 'history',
      icon: <History className="w-5 h-5 text-purple-500" />,
      desc: 'Completed downloads library'
    },
    {
      label: 'Settings',
      screen: 'settings',
      icon: <Settings className="w-5 h-5 text-gray-400" />,
      desc: 'Format, proxy & paths'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title & Brand Header with PageHeader */}
      <PageHeader
        icon={<img src={logoSrc} alt="Klyp Logo" className="w-7 h-7" />}
        title="Klyp"
        description="Download videos, audio discographies, and subtitles from multiple platforms with ease"
        badge={{
          text: `Emerald Engine • yt-dlp ${engineHealth.ytdlp_version.split(' ')[0]}`,
          variant: engineHealth.status === 'operational' ? 'emerald' : 'amber'
        }}
        actionSlot={
          <div className="hidden sm:flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-300'
                  : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#10b981]" />
              <span>FFmpeg 4.4</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse ml-1" />
            </div>
          </div>
        }
        theme={theme}
      />

      {/* URL Input Section with Single / Multi-line Batch Mode & Clipboard */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#10b981]" />
            <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              Media Download Input
            </h2>
            {isBatchMode && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-medium">
                Batch Mode {detectedUrls.length > 0 && `(${detectedUrls.length} links)`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                pastedFeedback
                  ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]'
                  : isDark
                  ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Read URL from your clipboard"
            >
              {pastedFeedback ? (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Pasted!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-gray-400" />
                  <span>Paste Clipboard</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                isBatchMode
                  ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                  : isDark
                  ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-400 hover:text-gray-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isBatchMode ? 'Single Mode' : 'Multi-Line Mode'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              {isBatchMode ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  rows={4}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste multiple URLs (one per line, up to 25 links)&#10;https://www.youtube.com/watch?v=...&#10;https://vimeo.com/..."
                  disabled={loading}
                  className={`w-full px-4 py-2.5 rounded-lg border font-mono text-sm focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all resize-y ${
                    isDark
                      ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder:text-gray-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              ) : (
                <div className="relative">
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Auto-switch to batch mode if multiple lines are pasted
                      if (val.includes('\n') || val.includes('\r')) {
                        setIsBatchMode(true);
                      }
                      setUrlInput(val);
                    }}
                    placeholder="Paste media URL (YouTube, Vimeo, SoundCloud, Bilibili, TikTok)..."
                    disabled={loading}
                    className={`w-full px-4 py-2.5 pr-8 rounded-lg border font-mono text-sm focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all ${
                      isDark
                        ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder:text-gray-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  {urlInput && !loading && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-0.5"
                      title="Clear input"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm shadow-md shadow-[#10b981]/20 disabled:opacity-50 transition-all cursor-pointer shrink-0 self-stretch sm:self-auto min-h-[42px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBatchMode && detectedUrls.length > 1 ? `Extracting (${detectedUrls.length})...` : 'Fetching Info...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    {isBatchMode && detectedUrls.length > 1
                      ? `Queue ${detectedUrls.length} URLs`
                      : 'Add to Queue'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Quick test links */}
          <div className={`flex flex-wrap items-center gap-2 pt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <Sparkles className="w-3.5 h-3.5 text-[#10b981]" /> Quick test URLs:
            </span>
            {sampleLinks.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setUrlInput(sample.url);
                  setIsBatchMode(false);
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer border ${
                  isDark
                    ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>

        {/* Actionable Error & Feedback Notice */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-lg border text-sm transition-all animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-[#10b981]/15 border-[#10b981]/30 text-[#10b981]'
                : feedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#10b981]" />
                ) : feedback.type === 'warning' ? (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">
                    {feedback.title}
                  </p>
                  <p className={`text-xs mt-1 break-words ${
                    feedback.type === 'success'
                      ? 'text-[#10b981]/90'
                      : feedback.type === 'warning'
                      ? 'text-amber-300/90'
                      : isDark
                      ? 'text-gray-300'
                      : 'text-slate-700'
                  }`}>
                    {feedback.message}
                  </p>
                  {feedback.suggestion && (
                    <p className="text-[11px] mt-1 text-gray-400 italic">
                      Tip: {feedback.suggestion}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {feedback.fallbackAction && (
                  <button
                    type="button"
                    onClick={feedback.fallbackAction.action}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#10b981] hover:bg-[#059669] text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{feedback.fallbackAction.label}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Live Active Transfer Widget (Condition: Any task currently downloading) */}
      {primaryActiveTask && (
        <SurfaceCard theme={theme} className="p-5 sm:p-6 shadow-sm border-[#10b981]/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#10b981]/20">
            <div
              className="h-full bg-[#10b981] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, primaryActiveTask.progress))}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Thumbnail with playing badge */}
              <div className="relative w-16 h-12 rounded-lg bg-black/40 overflow-hidden shrink-0 border border-black/20 flex items-center justify-center">
                {primaryActiveTask.video_info.thumbnail ? (
                  <img
                    src={primaryActiveTask.video_info.thumbnail}
                    alt={primaryActiveTask.video_info.title}
                    className="w-full h-full object-cover"
                  />
                ) : primaryActiveTask.is_music ? (
                  <Music className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Film className="w-6 h-6 text-blue-400" />
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] font-semibold border border-[#10b981]/30">
                    Downloading • {Math.round(primaryActiveTask.progress)}%
                  </span>
                  {activeDownloadingTasks.length > 1 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      +{activeDownloadingTasks.length - 1} more active
                    </span>
                  )}
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {primaryActiveTask.video_info.selected_quality}
                  </span>
                </div>

                <p className={`font-semibold text-sm truncate mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {primaryActiveTask.video_info.title}
                </p>

                <div className={`flex items-center gap-3 text-xs mt-1 font-mono tabular-nums ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  <span>Speed: <strong className="text-[#10b981] font-semibold">{primaryActiveTask.speed || 'Transferring...'}</strong></span>
                  <span>•</span>
                  <span>ETA: <strong>{primaryActiveTask.eta || '--:--'}</strong></span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {onStopTask && (
                <button
                  type="button"
                  onClick={() => onStopTask(primaryActiveTask.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title="Pause active transfer"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('queue')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Manage in Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* Recent Completed Downloads Section */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              Recent Completed Downloads
            </h2>
          </div>
          {recentCompleted.length > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentCompleted.length === 0 ? (
          <div className={`p-4 rounded-lg border text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <span>Completed downloads will appear here with instant replay and disk location access.</span>
            <button
              onClick={() => onNavigate('search')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981]/15 text-[#10b981] text-xs font-semibold hover:bg-[#10b981]/25 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Discover Content</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentCompleted.map((item) => {
              const info = item.video_info;
              const title = info.title;
              const thumb = info.thumbnail;
              const mediaUrl = ('media_url' in item ? item.media_url : ('output_file_url' in item ? item.output_file_url : '')) || '/api/media/sample';

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border flex flex-col justify-between gap-3 group transition-all ${
                    isDark
                      ? 'bg-[#1e1e1e] border-[#2d2d2d] hover:border-[#10b981]/40'
                      : 'bg-slate-50 border-slate-200 hover:border-[#10b981]/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-md bg-black/40 overflow-hidden shrink-0 border border-black/20 flex items-center justify-center">
                      {thumb ? (
                        <img src={thumb} alt={title} className="w-full h-full object-cover" />
                      ) : info.is_music ? (
                        <Music className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Film className="w-6 h-6 text-purple-400" />
                      )}
                      {info.duration_formatted && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[10px] font-mono text-white">
                          {info.duration_formatted}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-xs leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                      </p>
                      <p className={`text-[11px] truncate mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {info.author || info.platform || 'Media Stream'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#10b981]/15 text-[#10b981] font-medium border border-[#10b981]/30">
                          {info.selected_quality || 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-inherit">
                    <span className={`text-[10px] font-mono ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      {'completed_at' in item && item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Completed'}
                    </span>

                    {onPlayMedia && (
                      <button
                        type="button"
                        onClick={() => onPlayMedia(title, mediaUrl, thumb)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      {/* Feature Navigation Grid */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 shadow-sm">
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          Feature Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.screen)}
              className={`flex items-center gap-3.5 p-3 rounded-lg border text-left transition-all group cursor-pointer ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] hover:border-[#10b981]/60 hover:bg-[#282828]'
                  : 'bg-slate-50 border-slate-200 hover:border-[#10b981]/60 hover:bg-slate-100 shadow-xs'
              }`}
            >
              <div className={`p-2.5 rounded-lg transition-colors ${
                isDark ? 'bg-[#252526] group-hover:bg-[#10b981]/15' : 'bg-white border border-slate-200 group-hover:bg-[#10b981]/10'
              }`}>
                {action.icon}
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm group-hover:text-[#10b981] transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {action.label}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </SurfaceCard>

      {/* Queue Summary Section */}
      <SurfaceCard theme={theme} className="p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Live Queue Snapshot
          </h2>
          {queue.length > 0 && (
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs font-semibold text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className={`p-4 rounded-lg border text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <span>No videos currently in queue. Paste single or batch URLs above or explore platforms.</span>
            <button
              onClick={() => onNavigate('search')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981]/15 text-[#10b981] text-xs font-semibold hover:bg-[#10b981]/25 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Explore Content</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Total in Queue</span>
              <span className={`text-xl font-bold font-mono tabular-nums mt-1 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{queue.length}</span>
            </div>
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className="text-xs text-blue-500 block">Active Downloading</span>
              <span className="text-xl font-bold font-mono tabular-nums text-blue-500 mt-1 block">{downloadingCount}</span>
            </div>
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className="text-xs text-amber-500 block">Waiting in Queue</span>
              <span className="text-xl font-bold font-mono tabular-nums text-amber-500 mt-1 block">{queuedCount}</span>
            </div>
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className="text-xs text-[#10b981] block">Completed Transfers</span>
              <span className="text-xl font-bold font-mono tabular-nums text-[#10b981] mt-1 block">{completedCount}</span>
            </div>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
};
