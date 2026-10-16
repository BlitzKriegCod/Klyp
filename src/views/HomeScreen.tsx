import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { DownloadTask } from '../types';
import { ScreenType } from '../components/Sidebar';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  queue: DownloadTask[];
  onAddUrlToQueue: (url: string) => Promise<void>;
  theme: 'dark' | 'light';
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  queue,
  onAddUrlToQueue,
  theme,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/assets/klyp_logo.svg' : '/assets/klyp_logo_light.svg';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'Please enter a video URL' });
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setFeedback({ type: 'error', message: 'URL must start with http:// or https://' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await onAddUrlToQueue(trimmed);
      setUrlInput('');
      setFeedback({ type: 'success', message: 'Video successfully identified and prepared for queue!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to extract video information' });
    } finally {
      setLoading(false);
    }
  };

  const sampleLinks = [
    { label: 'Synthwave Radio', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
    { label: 'Exodus Remastered', url: 'https://www.youtube.com/watch?v=E8CaKFh52CU' },
    { label: 'Vimeo Animation', url: 'https://vimeo.com/76979871' },
    { label: 'SoundCloud Track', url: 'https://soundcloud.com/artist/sample-stream' }
  ];

  // Queue summary counts
  const queuedCount = queue.filter((t) => t.status === 'queued').length;
  const downloadingCount = queue.filter((t) => t.status === 'downloading').length;
  const completedCount = queue.filter((t) => t.status === 'completed').length;

  const quickActions: { label: string; screen: ScreenType; icon: React.ReactNode; desc: string }[] = [
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
      {/* Title & Brand Header */}
      <div className="flex items-center gap-4">
        <img src={logoSrc} alt="Klyp Logo" className="w-12 h-12" />
        <div>
          <h1 className={`text-3xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Klyp
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] font-medium">
              Emerald Edition
            </span>
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Download videos, audio, and subtitles from multiple platforms with ease
          </p>
        </div>
      </div>

      {/* URL Input Section (Card-like look) */}
      <div className={`rounded-xl border p-6 transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c] shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-[#10b981]" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Add Video
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste video URL (e.g. YouTube, Vimeo, Bilibili, TikTok, SoundCloud)..."
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg border font-mono text-sm focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all ${
                  isDark
                    ? 'bg-[#1e1e1e] border-[#454545] text-white placeholder:text-gray-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm shadow-md shadow-[#10b981]/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching Info...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Add to Queue</span>
                </>
              )}
            </button>
          </div>

          {/* Quick test pills */}
          <div className={`flex flex-wrap items-center gap-2 pt-1 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <Sparkles className="w-3 h-3 text-[#10b981]" /> Quick test URLs:
            </span>
            {sampleLinks.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => setUrlInput(sample.url)}
                className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#1e1e1e] hover:bg-[#3c3c3c] border-[#3c3c3c] text-gray-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
              feedback.type === 'success'
                ? 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981]'
                : 'bg-red-500/15 border border-red-500/30 text-red-500'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className={`rounded-xl border p-6 transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c] shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.screen)}
              className={`flex items-center gap-3.5 p-3.5 rounded-lg border text-left transition-all group cursor-pointer ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] hover:border-[#10b981]/60 hover:bg-[#2a2a2b]'
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
      </div>

      {/* Queue Summary Section */}
      <div className={`rounded-xl border p-6 transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c] shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            Queue Summary
          </h2>
          {queue.length > 0 && (
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs font-semibold text-[#10b981] hover:underline cursor-pointer"
            >
              Open Queue &rarr;
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className={`p-4 rounded-lg border text-sm flex items-center justify-between ${
            isDark ? 'bg-[#1e1e1e] border-[#3c3c3c] text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <span>No videos currently in queue. Paste a URL above or search to get started.</span>
            <button
              onClick={() => onNavigate('search')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981]/20 text-[#10b981] text-xs font-semibold hover:bg-[#10b981]/30 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Explore Videos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Total Items</span>
              <span className={`text-xl font-bold mt-1 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{queue.length}</span>
            </div>
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className="text-xs text-blue-500 block">Active Downloads</span>
              <span className="text-xl font-bold text-blue-500 mt-1 block">{downloadingCount}</span>
            </div>
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className="text-xs text-amber-500 block">Waiting in Queue</span>
              <span className="text-xl font-bold text-amber-500 mt-1 block">{queuedCount}</span>
            </div>
            <div className={`p-3.5 rounded-lg border ${
              isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className="text-xs text-[#10b981] block">Completed</span>
              <span className="text-xl font-bold text-[#10b981] mt-1 block">{completedCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
