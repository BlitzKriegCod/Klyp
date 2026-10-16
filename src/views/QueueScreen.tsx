import React, { useRef } from 'react';
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
  FolderOpen,
  Film,
  Music
} from 'lucide-react';
import { DownloadTask, DownloadStatus } from '../types';

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const getStatusBadge = (status: DownloadStatus) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#10b981]/20 text-[#10b981] animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            Downloading
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
            <Pause className="w-3 h-3" />
            Paused
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Download className="w-6 h-6 text-[#10b981]" />
              Download Queue
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#3c3c3c] text-gray-300 font-mono">
              {queue.length} items
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] font-medium">
              Mode: {downloadMode === 'parallel' ? `Parallel (${maxConcurrent} threads)` : 'Sequential'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Manage active transfers, pause, resume, and export batch queues
          </p>
        </div>

        {/* Action Controls Frame (matching ttkbootstrap layout from Python) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStartAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold shadow-md shadow-[#10b981]/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start All
          </button>

          <button
            onClick={onStopAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3c3c3c] hover:bg-[#4a4a4b] text-gray-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause All
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252526] hover:bg-[#333] border border-[#3c3c3c] text-gray-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />

          <button
            onClick={onExportQueue}
            disabled={queue.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252526] hover:bg-[#333] border border-[#3c3c3c] text-gray-300 text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <button
            onClick={onClearCompleted}
            disabled={!queue.some((q) => q.status === 'completed')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#252526] hover:bg-[#333] border border-[#3c3c3c] text-gray-300 text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer"
          >
            Clear Finished
          </button>

          <button
            onClick={onClearQueue}
            disabled={queue.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Main Queue Treeview Table */}
      <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] overflow-hidden shadow-xl">
        {queue.length === 0 ? (
          <div className="py-20 text-center text-gray-400 space-y-3">
            <Download className="w-12 h-12 mx-auto text-gray-500" />
            <p className="text-base font-medium text-gray-300">Your download queue is empty</p>
            <p className="text-xs">Add video URLs from the Home screen or Search explorer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#d4d4d4]">
              <thead className="bg-[#1e1e1e] border-b border-[#3c3c3c] text-xs uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Video Title / URL</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Format / Quality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 w-44">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {queue.map((task, idx) => {
                  const isAudio = task.video_info.selected_quality?.toLowerCase().includes('audio');
                  return (
                    <tr key={task.id} className="hover:bg-[#2a2a2b] transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-xs text-gray-500">
                        {idx + 1}
                      </td>

                      {/* Video Title + thumbnail */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center gap-3">
                          {task.video_info.thumbnail ? (
                            <img
                              src={task.video_info.thumbnail}
                              alt=""
                              className="w-12 h-8 rounded object-cover bg-black shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-8 rounded bg-[#333] flex items-center justify-center shrink-0">
                              {isAudio ? <Music className="w-4 h-4 text-gray-400" /> : <Film className="w-4 h-4 text-gray-400" />}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate" title={task.video_info.title}>
                              {task.video_info.title || task.video_info.url}
                            </p>
                            <p className="text-xs text-gray-500 font-mono truncate">{task.video_info.url}</p>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-300">
                        {task.video_info.author || 'Creator'}
                      </td>

                      {/* Quality */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span className="px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] text-gray-300">
                          {task.video_info.selected_quality}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{Math.round(task.progress)}%</span>
                            {task.speed && <span className="text-[#10b981]">{task.speed}</span>}
                          </div>
                          <div className="w-full bg-[#1e1e1e] rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500'
                                  : task.status === 'failed'
                                  ? 'bg-red-500'
                                  : task.status === 'stopped'
                                  ? 'bg-gray-500'
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
                              className="p-1.5 rounded-md bg-[#1e1e1e] hover:bg-[#333] text-amber-400 hover:text-white transition-colors"
                              title="Pause Download"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          ) : task.status === 'completed' ? (
                            <button
                              onClick={() => onPreviewTask(task)}
                              className="p-1.5 rounded-md bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] transition-colors"
                              title="Play Downloaded File"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onStartTask(task.id)}
                              className="p-1.5 rounded-md bg-[#1e1e1e] hover:bg-[#333] text-[#10b981] hover:text-white transition-colors"
                              title="Start Download"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          <button
                            onClick={() => onRemoveTask(task.id)}
                            className="p-1.5 rounded-md bg-[#1e1e1e] hover:bg-red-600/30 text-gray-400 hover:text-red-400 transition-colors"
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
        )}
      </div>

      {/* Active Download Progress Bar Footer (Matching Python ttkbootstrap Progressbar) */}
      {activeTask && (
        <div className="rounded-xl bg-[#252526] border border-[#3c3c3c] p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                Active Transfer: {activeTask.video_info.title || 'Downloading Video'}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
              {activeTask.speed && <span>Speed: <strong className="text-white">{activeTask.speed}</strong></span>}
              {activeTask.eta && <span>ETA: <strong className="text-white">{activeTask.eta}</strong></span>}
              <span>Progress: <strong className="text-[#10b981]">{Math.round(activeTask.progress)}%</strong></span>
            </div>
          </div>

          <div className="w-full bg-[#1e1e1e] rounded-full h-3 overflow-hidden p-0.5 border border-[#3c3c3c]">
            <div
              className="bg-[#10b981] h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${Math.max(2, activeTask.progress)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Destination: {activeTask.download_path || '~/Downloads/Klyp'}</span>
            <span>Status: {activeTask.status.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
