import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Play,
  Download,
  RotateCcw,
  Film,
  Music,
  FileDown
} from 'lucide-react';
import { DownloadHistory, VideoInfo } from '../types';

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <History className="w-6 h-6 text-[#10b981]" />
            Download History
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Track and play previously downloaded video and audio files
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportHistory}
            disabled={history.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer ${
              isDark ? 'bg-[#252526] hover:bg-[#333] border-[#3c3c3c] text-gray-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            Export History
          </button>

          <button
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        </div>
      </div>

      {/* Search Filter Bar Card */}
      <div className={`rounded-xl border p-4 shadow-sm transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-slate-200'
      }`}>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isDark ? 'text-gray-400' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter history by title, channel, or platform..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#10b981] ${
              isDark
                ? 'bg-[#1e1e1e] border-[#454545] text-white placeholder:text-gray-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* History Items Table Card */}
      <div className={`rounded-xl border overflow-hidden shadow-sm transition-colors ${
        isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-slate-200'
      }`}>
        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <History className={`w-12 h-12 mx-auto ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
            <p className={`text-base font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              {searchTerm ? 'No history matching your filter' : 'No download history yet'}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Completed downloads will automatically be recorded here for instant access.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase ${
                isDark ? 'bg-[#1e1e1e] border-[#3c3c3c] text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-500'
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
              <tbody className={`divide-y ${isDark ? 'divide-[#333]' : 'divide-slate-200'}`}>
                {filtered.map((item) => {
                  const isAudio = item.video_info.selected_quality?.toLowerCase().includes('audio');
                  return (
                    <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-[#2a2a2b]' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 px-5 max-w-sm">
                        <div className="flex items-center gap-3">
                          {item.video_info.thumbnail ? (
                            <img
                              src={item.video_info.thumbnail}
                              alt=""
                              className="w-14 h-9 object-cover rounded bg-black shrink-0"
                            />
                          ) : (
                            <div className={`w-14 h-9 rounded flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-[#333]' : 'bg-slate-200'
                            }`}>
                              {isAudio ? <Music className="w-4 h-4 text-gray-400" /> : <Film className="w-4 h-4 text-gray-400" />}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className={`font-medium truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`} title={item.video_info.title}>
                              {item.video_info.is_music && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                                  MUSIC
                                </span>
                              )}
                              <span className="truncate">{item.video_info.title}</span>
                            </p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                              {item.video_info.album ? `${item.video_info.author} • ${item.video_info.album}` : item.video_info.author}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#10b981]/15 text-[#10b981]">
                          {item.video_info.platform || 'Web Stream'}
                        </span>
                      </td>

                      <td className={`py-3 px-4 whitespace-nowrap font-mono text-xs ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                        {item.file_size_formatted || `${(item.file_size / (1024 * 1024)).toFixed(1)} MB`}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span className={`px-2 py-0.5 rounded border ${
                          isDark ? 'bg-[#1e1e1e] border-[#3c3c3c] text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {item.video_info.selected_quality}
                        </span>
                      </td>

                      <td className={`py-3 px-4 whitespace-nowrap text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
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
                            className="p-1.5 rounded-md bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] transition-colors cursor-pointer"
                            title="Play in Media Player"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Direct file download */}
                          <a
                            href={item.media_url || '/api/media/sample'}
                            download={`${item.video_info.title}.mp4`}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-[#333] text-gray-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Download File to Computer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Re-add to queue */}
                          <button
                            onClick={() => onRequeue(item.video_info)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-[#333] text-gray-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Download Again"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove */}
                          <button
                            onClick={() => onRemoveHistoryItem(item.id)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isDark ? 'bg-[#1e1e1e] hover:bg-red-600/30 text-gray-400 hover:text-red-400' : 'bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600'
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
        )}
      </div>
    </div>
  );
};
