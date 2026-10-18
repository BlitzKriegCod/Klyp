import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Play,
  Download,
  RotateCcw,
  Film,
  Disc3,
  FileDown
} from 'lucide-react';
import { DownloadHistory, VideoInfo } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';
import { EmptyState } from '../components/common/EmptyState';

interface HistoryScreenProps {
  history: DownloadHistory[];
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
  onRequeue: (videoInfo: VideoInfo) => void;
  onPlayMedia: (title: string, url: string, thumb?: string) => void;
  theme?: 'dark' | 'light';
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  onClearHistory,
  onRemoveHistoryItem,
  onRequeue,
  onPlayMedia,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const isDark = theme === 'dark';

  const filtered = history.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.video_info.title.toLowerCase().includes(q) ||
      item.video_info.author.toLowerCase().includes(q) ||
      (item.video_info.platform && item.video_info.platform.toLowerCase().includes(q))
    );
  });

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klyp_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Standardized PageHeader */}
      <PageHeader
        icon={<History className="w-6 h-6" />}
        title="Download History"
        description="Inspect, play, and re-enqueue previously downloaded videos and audio"
        badge={history.length > 0 ? { text: `${history.length} Downloads`, variant: 'neutral' } : undefined}
        theme={theme}
        actionSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={exportHistory}
              disabled={history.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#2d2d2d] text-gray-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        }
      />

      {/* 2. Search Filter Bar Card */}
      <SurfaceCard theme={theme} className="p-4 shadow-sm">
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isDark ? 'text-gray-400' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter library by title, creator, or platform..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:border-[#10b981] ${
              isDark
                ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder:text-gray-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </SurfaceCard>

      {/* 3. History Items Table & Adaptive Mobile Cards */}
      <SurfaceCard theme={theme} className="overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title={searchTerm ? 'No matching records' : 'No download history yet'}
            description="Completed video and audio transfers will automatically be recorded here."
            theme={theme}
          />
        ) : (
          <>
            {/* Desktop View: High Density Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b text-xs uppercase ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <tr>
                    <th className="py-3 px-5">Media Title</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Quality / Format</th>
                    <th className="py-3 px-4">Finished At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#2d2d2d]' : 'divide-slate-200'}`}>
                  {filtered.map((item) => {
                    const isAudio = item.video_info.selected_quality?.toLowerCase().includes('audio') || item.video_info.is_music;

                    return (
                      <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-[#1e1e1e]' : 'hover:bg-slate-50'}`}>
                        <td className="py-3 px-5 max-w-sm">
                          <div className="flex items-center gap-3">
                            {item.video_info.thumbnail ? (
                              <img
                                src={item.video_info.thumbnail}
                                alt=""
                                className="w-14 h-9 object-cover rounded bg-black shrink-0 border border-white/5"
                              />
                            ) : (
                              <div className={`w-14 h-9 rounded flex items-center justify-center shrink-0 border ${
                                isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-200 border-slate-300'
                              }`}>
                                {isAudio ? <Disc3 className="w-4 h-4 text-emerald-400" /> : <Film className="w-4 h-4 text-gray-400" />}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className={`font-medium text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={item.video_info.title}>
                                {item.video_info.title}
                              </p>
                              {/* Zero-pill typographic metadata */}
                              <div className={`text-xs font-mono truncate mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                <span>{item.video_info.author}</span>
                                {item.video_info.album && (
                                  <>
                                    <span>·</span>
                                    <span className="text-[#10b981]">{item.video_info.album}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-[#10b981]">
                          {item.video_info.platform || 'Web Stream'}
                        </td>

                        <td className={`py-3 px-4 whitespace-nowrap font-mono text-xs tabular-nums ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                          {item.file_size_formatted || `${(item.file_size / (1024 * 1024)).toFixed(1)} MB`}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-gray-400">
                          {item.video_info.selected_quality}
                        </td>

                        <td className={`py-3 px-4 whitespace-nowrap text-xs font-mono ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {formatDate(item.completed_at)}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Play in Modal Player */}
                            <button
                              onClick={() =>
                                onPlayMedia(
                                  item.video_info.title,
                                  item.media_url || item.video_info.url,
                                  item.video_info.thumbnail
                                )
                              }
                              className="p-1.5 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] transition-colors cursor-pointer"
                              title="Play Media"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>

                            {/* Direct file download */}
                            <a
                              href={item.media_url || '/api/media/sample'}
                              download={`${item.video_info.title}.mp4`}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              }`}
                              title="Save to Disk"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            {/* Re-add to queue */}
                            <button
                              onClick={() => onRequeue(item.video_info)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              }`}
                              title="Download Again"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Remove */}
                            <button
                              onClick={() => onRemoveHistoryItem(item.id)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-[#1e1e1e] hover:bg-red-500/20 border-[#2d2d2d] text-gray-400 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 border-slate-300 text-slate-400 hover:text-red-600'
                              }`}
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Adaptive Card Stack */}
            <div className="block md:hidden divide-y divide-[#2d2d2d] p-3 space-y-3">
              {filtered.map((item) => {
                const isAudio = item.video_info.selected_quality?.toLowerCase().includes('audio') || item.video_info.is_music;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-colors ${
                      isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {item.video_info.thumbnail ? (
                        <img
                          src={item.video_info.thumbnail}
                          alt=""
                          className="w-16 h-11 rounded-lg object-cover bg-black shrink-0 border border-white/5"
                        />
                      ) : (
                        <div className={`w-16 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                          isDark ? 'bg-[#252526] border-[#2d2d2d]' : 'bg-slate-200 border-slate-300'
                        }`}>
                          {isAudio ? <Disc3 className="w-5 h-5 text-emerald-400" /> : <Film className="w-5 h-5 text-gray-400" />}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.video_info.title}
                        </h4>
                        <div className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                          {item.video_info.author}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-400">
                          <span className="text-[#10b981]">{item.video_info.platform || 'Stream'}</span>
                          <span>·</span>
                          <span>{item.file_size_formatted || `${(item.file_size / (1024 * 1024)).toFixed(1)} MB`}</span>
                          <span>·</span>
                          <span>{item.video_info.selected_quality}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between gap-2 ${
                      isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
                    }`}>
                      <span className="text-[10px] font-mono text-gray-400">
                        {formatDate(item.completed_at)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            onPlayMedia(
                              item.video_info.title,
                              item.media_url || item.video_info.url,
                              item.video_info.thumbnail
                            )
                          }
                          className="p-1.5 rounded-lg bg-[#10b981]/20 text-[#10b981] cursor-pointer"
                          title="Play"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => onRequeue(item.video_info)}
                          className={`p-1.5 rounded-lg border text-gray-300 cursor-pointer ${
                            isDark ? 'border-[#2d2d2d] bg-[#252526]' : 'border-slate-300 bg-white'
                          }`}
                          title="Re-queue"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveHistoryItem(item.id)}
                          className={`p-1.5 rounded-lg border text-gray-400 hover:text-red-400 cursor-pointer ${
                            isDark ? 'border-[#2d2d2d] bg-[#252526]' : 'border-slate-300 bg-white'
                          }`}
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SurfaceCard>
    </div>
  );
};
