import React, { useRef, useState } from 'react';
import {
  Download,
  Play,
  Pause,
  Trash2,
  Upload,
  FileDown,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  Film,
  Music,
  MoreVertical,
  Check,
  Disc3
} from 'lucide-react';
import { DownloadTask, DownloadStatus } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';
import { EmptyState } from '../components/common/EmptyState';

interface QueueScreenProps {
  queue: DownloadTask[];
  onStartAll: () => void;
  onStopAll: () => void;
  onStartTask: (taskId: string) => void;
  onStopTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onClearQueue: () => void;
  onClearCompleted: () => void;
  onImportQueue: (tasks: DownloadTask[]) => void;
  onExportQueue: () => void;
  onPreviewTask: (task: DownloadTask) => void;
  downloadMode: 'sequential' | 'parallel';
  maxConcurrent: number;
  theme?: 'dark' | 'light';
}

export const QueueScreen: React.FC<QueueScreenProps> = ({
  queue,
  onStartAll,
  onStopAll,
  onStartTask,
  onStopTask,
  onRemoveTask,
  onClearQueue,
  onClearCompleted,
  onImportQueue,
  onExportQueue,
  onPreviewTask,
  downloadMode,
  maxConcurrent,
  theme = 'dark',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const isDark = theme === 'dark';

  const activeTask = queue.find((t) => t.status === 'downloading') || queue[0];

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportQueue(parsed);
        }
      } catch (err) {
        alert('Invalid JSON file for queue import.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsActionsMenuOpen(false);
  };

  const getStatusBadge = (status: DownloadStatus) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
            Downloading
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'stopped':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
            isDark ? 'bg-gray-500/15 text-gray-300 border-gray-600/30' : 'bg-slate-200 text-slate-700 border-slate-300'
          }`}>
            <Pause className="w-3 h-3" />
            Paused
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Standardized Header with Action Controls */}
      <PageHeader
        icon={<Download className="w-6 h-6" />}
        title="Download Queue"
        description="Monitor active transfers, pause, resume, and manage batch downloads"
        badge={{
          text: downloadMode === 'parallel' ? `Parallel (${maxConcurrent} Threads)` : 'Sequential Mode',
          variant: 'neutral'
        }}
        theme={theme}
        actionSlot={
          <div className="flex items-center gap-2 relative">
            {/* Primary Action Button (Hick's Law consolidation) */}
            <button
              onClick={onStartAll}
              disabled={queue.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start All</span>
            </button>

            <button
              onClick={onStopAll}
              disabled={queue.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-40 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#2d2d2d] text-gray-200'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>

            {/* Queue Options Dropdown Menu (Hick's Law reduction) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                className={`p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#2d2d2d] text-gray-300'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                }`}
                title="More Queue Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isActionsMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-xl border p-1.5 shadow-2xl z-20 animate-in fade-in duration-150 ${
                    isDark ? 'bg-[#252526] border-[#2d2d2d] text-gray-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#2d2d2d] text-gray-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Import Queue JSON</span>
                  </button>

                  <button
                    onClick={() => {
                      onExportQueue();
                      setIsActionsMenuOpen(false);
                    }}
                    disabled={queue.length === 0}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                      isDark ? 'hover:bg-[#2d2d2d] text-gray-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export Queue JSON</span>
                  </button>

                  <div className={`my-1 border-t ${isDark ? 'border-[#2d2d2d]' : 'border-slate-200'}`} />

                  <button
                    onClick={() => {
                      onClearCompleted();
                      setIsActionsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#2d2d2d] text-amber-400' : 'hover:bg-slate-100 text-amber-600'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Clear Completed</span>
                  </button>

                  <button
                    onClick={() => {
                      onClearQueue();
                      setIsActionsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Entire Queue</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        }
      />

      {/* 2. Main Queue Container */}
      <SurfaceCard theme={theme} className="overflow-hidden shadow-sm">
        {queue.length === 0 ? (
          <EmptyState
            icon={<Download className="w-6 h-6" />}
            title="Download queue is empty"
            description="Paste a video URL on the Home screen or browse artist discographies to enqueue downloads."
            theme={theme}
          />
        ) : (
          <>
            {/* Desktop View: High-density Tabular Grid (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b text-xs uppercase ${
                  isDark ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Item Title & Metadata</th>
                    <th className="py-3 px-4">Format / Quality</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 w-48">Progress</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#2d2d2d]' : 'divide-slate-200'}`}>
                  {queue.map((task, idx) => {
                    const isAudio = task.video_info.selected_quality?.toLowerCase().includes('audio') || task.is_music;

                    return (
                      <tr key={task.id} className={`transition-colors ${isDark ? 'hover:bg-[#1e1e1e]' : 'hover:bg-slate-50'}`}>
                        <td className={`py-3 px-4 text-center font-mono text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                          {idx + 1}
                        </td>

                        {/* Title + Thumbnail + Zero-pill metadata */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="flex items-center gap-3">
                            {task.video_info.thumbnail ? (
                              <img
                                src={task.video_info.thumbnail}
                                alt=""
                                className="w-12 h-9 rounded object-cover bg-black shrink-0 border border-white/5"
                              />
                            ) : (
                              <div className={`w-12 h-9 rounded flex items-center justify-center shrink-0 border ${
                                isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-200 border-slate-300'
                              }`}>
                                {isAudio ? <Disc3 className="w-4 h-4 text-emerald-400" /> : <Film className="w-4 h-4 text-gray-400" />}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className={`font-medium text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={task.video_info.title}>
                                {task.video_info.title || task.video_info.url}
                              </p>
                              {/* Zero-pill typographic metadata middot list */}
                              <div className={`text-xs font-mono truncate mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                <span>{task.video_info.author || 'Creator'}</span>
                                {task.video_info.album && (
                                  <>
                                    <span>·</span>
                                    <span className="text-[#10b981]">{task.video_info.album}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Format */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-gray-400">
                          {task.video_info.selected_quality || 'Default'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(task.status)}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-mono tabular-nums">
                              <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>{Math.round(task.progress)}%</span>
                              {task.speed && <span className="text-[#10b981] font-semibold">{task.speed}</span>}
                            </div>
                            <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-[#1e1e1e]' : 'bg-slate-200'}`}>
                              <div
                                className={`h-full transition-all duration-300 ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : task.status === 'failed'
                                    ? 'bg-red-500'
                                    : task.status === 'stopped'
                                    ? 'bg-gray-400'
                                    : 'bg-[#10b981]'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {task.status === 'downloading' ? (
                              <button
                                onClick={() => onStopTask(task.id)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-amber-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-amber-600'
                                }`}
                                title="Pause Download"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : task.status === 'completed' ? (
                              <>
                                <button
                                  onClick={() => onPreviewTask(task)}
                                  className="p-1.5 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] transition-colors cursor-pointer"
                                  title="Play Media File"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                                {task.download_url && (
                                  <a
                                    href={task.download_url}
                                    download
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-[#10b981]' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#10b981]'
                                    }`}
                                    title="Save to Disk"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => onStartTask(task.id)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isDark ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-[#10b981]' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#10b981]'
                                }`}
                                title="Start Download"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}

                            <button
                              onClick={() => onRemoveTask(task.id)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isDark ? 'bg-[#1e1e1e] hover:bg-red-500/20 border-[#2d2d2d] text-gray-400 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 border-slate-200 text-slate-400 hover:text-red-600'
                              }`}
                              title="Remove from queue"
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

            {/* Mobile View: Adaptive Card Stack (eliminates horizontal overflow) */}
            <div className="block md:hidden divide-y divide-[#2d2d2d] p-3 space-y-3">
              {queue.map((task, idx) => {
                const isAudio = task.video_info.selected_quality?.toLowerCase().includes('audio') || task.is_music;

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border flex flex-col gap-3 transition-colors ${
                      isDark ? 'bg-[#1e1e1e] border-[#2d2d2d]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {task.video_info.thumbnail ? (
                        <img
                          src={task.video_info.thumbnail}
                          alt=""
                          className="w-16 h-12 rounded-lg object-cover bg-black shrink-0 border border-white/5"
                        />
                      ) : (
                        <div className={`w-16 h-12 rounded-lg flex items-center justify-center shrink-0 border ${
                          isDark ? 'bg-[#252526] border-[#2d2d2d]' : 'bg-slate-200 border-slate-300'
                        }`}>
                          {isAudio ? <Disc3 className="w-5 h-5 text-emerald-400" /> : <Film className="w-5 h-5 text-gray-400" />}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-gray-400">#{idx + 1}</span>
                          {getStatusBadge(task.status)}
                        </div>
                        <h4 className={`text-xs font-bold truncate mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {task.video_info.title || task.video_info.url}
                        </h4>
                        <p className={`text-[11px] truncate font-mono mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {task.video_info.author} {task.video_info.album ? `• ${task.video_info.album}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono tabular-nums">
                        <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>{Math.round(task.progress)}%</span>
                        {task.speed && <span className="text-[#10b981] font-semibold">{task.speed}</span>}
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-[#252526]' : 'bg-slate-200'}`}>
                        <div
                          className={`h-full transition-all duration-300 ${
                            task.status === 'completed'
                              ? 'bg-emerald-500'
                              : task.status === 'failed'
                              ? 'bg-red-500'
                              : task.status === 'stopped'
                              ? 'bg-gray-400'
                              : 'bg-[#10b981]'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile Touch Action Controls (min 44px height) */}
                    <div className={`pt-2 border-t flex items-center justify-between gap-2 ${
                      isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
                    }`}>
                      <span className="text-[11px] font-mono text-gray-400 truncate max-w-[140px]">
                        {task.video_info.selected_quality || 'Default'}
                      </span>

                      <div className="flex items-center gap-2">
                        {task.status === 'downloading' ? (
                          <button
                            onClick={() => onStopTask(task.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        ) : task.status === 'completed' ? (
                          <>
                            <button
                              onClick={() => onPreviewTask(task)}
                              className="px-3 py-1.5 rounded-lg bg-[#10b981]/20 text-[#10b981] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play</span>
                            </button>
                            {task.download_url && (
                              <a
                                href={task.download_url}
                                download
                                className="p-1.5 rounded-lg border border-[#2d2d2d] text-[#10b981] cursor-pointer"
                              >
                                <FileDown className="w-4 h-4" />
                              </a>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => onStartTask(task.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#10b981] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </button>
                        )}

                        <button
                          onClick={() => onRemoveTask(task.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isDark ? 'border-[#2d2d2d] text-gray-400 hover:text-red-400' : 'border-slate-300 text-slate-500'
                          }`}
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* 3. Active Transfer Sticky Bottom Info */}
      {activeTask && (
        <SurfaceCard theme={theme} className="p-4 sm:p-5 shadow-sm space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Download className="w-4 h-4 text-[#10b981] shrink-0" />
              <h3 className={`text-xs sm:text-sm font-semibold truncate ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                Active: {activeTask.video_info.title || 'Downloading Media'}
              </h3>
            </div>
            <div className={`flex items-center gap-3 text-xs font-mono tabular-nums shrink-0 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {activeTask.speed && <span>Speed: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{activeTask.speed}</strong></span>}
              {activeTask.eta && <span>ETA: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{activeTask.eta}</strong></span>}
              <span>Progress: <strong className="text-[#10b981]">{Math.round(activeTask.progress)}%</strong></span>
            </div>
          </div>

          <div className={`w-full rounded-full h-2 overflow-hidden ${
            isDark ? 'bg-[#1e1e1e]' : 'bg-slate-200'
          }`}>
            <div
              className="bg-[#10b981] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(2, activeTask.progress)}%` }}
            />
          </div>
        </SurfaceCard>
      )}
    </div>
  );
};
