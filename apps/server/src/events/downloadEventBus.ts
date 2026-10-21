import { EventEmitter } from 'events';
import type { DownloadEventMap } from '@klyp/shared';

class DownloadEventBus extends EventEmitter {
  emitEvent<K extends keyof DownloadEventMap>(event: K, payload: DownloadEventMap[K]): boolean {
    return this.emit(event, payload);
  }

  onEvent<K extends keyof DownloadEventMap>(event: K, listener: (payload: DownloadEventMap[K]) => void): this {
    return this.on(event, listener);
  }

  offEvent<K extends keyof DownloadEventMap>(event: K, listener: (payload: DownloadEventMap[K]) => void): this {
    return this.off(event, listener);
  }

  emitTaskStarted(taskId: string, url: string) {
    this.emit('task:started', { taskId, url, timestamp: new Date().toISOString() });
    this.emit('task:status', { taskId, status: 'downloading' });
  }

  emitTaskProgress(data: { taskId: string; progress: number; speed?: string; eta?: string }) {
    this.emit('task:progress', data);
  }

  emitTaskLog(data: { taskId: string; log: string; level: 'info' | 'warn' | 'error' }) {
    this.emit('task:log', data);
  }

  emitTaskCompleted(data: { taskId: string; status: 'completed'; outputFile?: string; outputFileUrl?: string; downloadUrl?: string; fileSize?: number }) {
    this.emit('task:completed', data);
    this.emit('task:status', { taskId: data.taskId, status: 'completed', outputPath: data.outputFile, completedAt: new Date().toISOString() });
  }

  emitTaskFailed(data: { taskId: string; status: 'failed'; errorMessage?: string }) {
    this.emit('task:failed', data);
    this.emit('task:status', { taskId: data.taskId, status: 'failed', errorMessage: data.errorMessage });
  }

  emitTaskCancelled(taskId: string) {
    this.emit('task:cancelled', { taskId, timestamp: new Date().toISOString() });
    this.emit('task:status', { taskId, status: 'cancelled' });
  }
}

export const downloadEventBus = new DownloadEventBus();
