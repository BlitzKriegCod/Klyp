import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { DOWNLOADS_DIR } from '../config/env';
import { downloadEventBus } from '../events/downloadEventBus';
import { YtDlpService, DownloadOptions } from '../services/ytdlp.service';
import { FileService } from '../services/file.service';
import { DownloadStatus } from '@klyp/shared';

export interface ActiveDownloadRecord {
  child?: ChildProcess;
  id: string;
  url: string;
  progress: number;
  speed: string;
  eta: string;
  status: DownloadStatus;
  outputFile?: string;
  outputFileName?: string;
  outputFileUrl?: string;
  downloadUrl?: string;
  fileSize?: number;
  errorMessage?: string;
  startedAt: number;
  isMusic?: boolean;
  metadata?: any;
}

export class TaskQueueWorker {
  private static instance: TaskQueueWorker;
  private activeDownloads = new Map<string, ActiveDownloadRecord>();
  private queue: DownloadOptions[] = [];
  private maxConcurrent = 3;
  private runningCount = 0;

  private constructor() {}

  static getInstance(): TaskQueueWorker {
    if (!TaskQueueWorker.instance) {
      TaskQueueWorker.instance = new TaskQueueWorker();
    }
    return TaskQueueWorker.instance;
  }

  setMaxConcurrent(val: number) {
    if (val > 0) this.maxConcurrent = val;
  }

  getTask(id: string): ActiveDownloadRecord | undefined {
    return this.activeDownloads.get(id);
  }

  getAllTasks(): ActiveDownloadRecord[] {
    return Array.from(this.activeDownloads.values());
  }

  getActiveCount(): number {
    return this.activeDownloads.size;
  }

  startDownload(options: DownloadOptions): ActiveDownloadRecord {
    const { taskId, url } = options;

    const existing = this.activeDownloads.get(taskId);
    if (existing && existing.status === 'downloading') {
      return existing;
    }

    const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const outputTemplate = path.join(DOWNLOADS_DIR, `klyp_${safeTaskId}_%(title).50s.%(ext)s`);
    const args = YtDlpService.buildDownloadArgs(options, outputTemplate);

    console.log(`[TaskQueueWorker] Spawning yt-dlp for task ${taskId}:`, args.join(' '));

    let detectedOutputFile = '';
    const child = spawn('yt-dlp', args);

    const record: ActiveDownloadRecord = {
      child,
      id: taskId,
      url,
      progress: 0,
      speed: 'Starting...',
      eta: '--:--',
      status: 'downloading',
      startedAt: Date.now()
    };

    this.activeDownloads.set(taskId, record);
    downloadEventBus.emitTaskStarted(taskId, url);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');

      for (const line of lines) {
        const destMatch = line.match(/\[(?:download|Merger|ExtractAudio)\]\s+(?:Destination:\s+|Merging formats into\s+)"?([^"\r\n]+)"?/i);
        if (destMatch && destMatch[1]) {
          detectedOutputFile = destMatch[1].trim();
        }

        const progMatch = line.match(/\[download\]\s+([\d\.]+)%\s+of\s+([~?\w\.\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/i);
        if (progMatch) {
          const pct = parseFloat(progMatch[1]);
          const speed = progMatch[3];
          const eta = progMatch[4];

          record.progress = isNaN(pct) ? record.progress : Math.min(99.5, pct);
          record.speed = speed;
          record.eta = eta;

          downloadEventBus.emitTaskProgress({
            taskId,
            progress: record.progress,
            speed: record.speed,
            eta: record.eta
          });
        }

        if (/\[download\]\s+100%\s+of/i.test(line)) {
          record.progress = 99;
        }
      }
    });

    child.stderr.on('data', (data) => {
      const errText = data.toString();
      if (!errText.includes('WARNING') && !errText.includes('Deprecated Feature')) {
        record.errorMessage = errText.slice(0, 300);
        downloadEventBus.emitTaskLog({ taskId, log: record.errorMessage || '', level: 'warn' });
      }
    });

    child.on('close', (code) => {
      if (record.status === 'stopped') {
        return;
      }

      if (code === 0) {
        record.status = 'completed';
        record.progress = 100;
        record.speed = 'Finished';
        record.eta = '00:00';

        let finalPath = detectedOutputFile;
        if (!finalPath || !fs.existsSync(finalPath)) {
          finalPath = FileService.findOutputFile(`klyp_${safeTaskId}`) || '';
        }

        if (finalPath && fs.existsSync(finalPath)) {
          const stats = fs.statSync(finalPath);
          const fileName = path.basename(finalPath);
          record.outputFile = finalPath;
          record.outputFileName = fileName;
          record.fileSize = stats.size;
          record.outputFileUrl = `/media/${encodeURIComponent(fileName)}`;
          record.downloadUrl = `/api/download/file/${encodeURIComponent(fileName)}`;
        } else {
          record.outputFileUrl = '/api/media/sample';
          record.downloadUrl = '/api/media/sample';
        }

        downloadEventBus.emitTaskCompleted({
          taskId,
          status: 'completed',
          outputFile: record.outputFile,
          outputFileUrl: record.outputFileUrl,
          downloadUrl: record.downloadUrl,
          fileSize: record.fileSize
        });
      } else {
        record.status = 'failed';
        record.speed = '0 MB/s';
        record.errorMessage = record.errorMessage || `yt-dlp exited with code ${code}`;

        downloadEventBus.emitTaskFailed({
          taskId,
          status: 'failed',
          errorMessage: record.errorMessage
        });
      }
    });

    child.on('error', (err) => {
      if (record.status !== 'stopped') {
        record.status = 'failed';
        record.errorMessage = err.message;
        downloadEventBus.emitTaskFailed({
          taskId,
          status: 'failed',
          errorMessage: err.message
        });
      }
    });

    return record;
  }

  cancelDownload(taskId: string): boolean {
    const item = this.activeDownloads.get(taskId);
    if (!item) return false;

    item.status = 'stopped';
    item.speed = '0 MB/s';

    if (item.child && !item.child.killed) {
      try {
        item.child.kill('SIGTERM');
      } catch {}
    }

    downloadEventBus.emitTaskCancelled(taskId);
    return true;
  }
}

export const taskQueueWorker = TaskQueueWorker.getInstance();
