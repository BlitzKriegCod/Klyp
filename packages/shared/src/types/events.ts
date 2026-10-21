/**
 * Typed events for Klyp Event-Driven Download Engine
 */

import { DownloadStatus } from './index';

export interface TaskProgressPayload {
  taskId: string;
  progress: number;
  speed?: string;
  eta?: string;
  downloadedBytes?: number;
  totalBytes?: number;
}

export interface TaskStatusPayload {
  taskId: string;
  status: DownloadStatus;
  outputFile?: string;
  outputFileUrl?: string;
  downloadUrl?: string;
  fileSize?: number;
  errorMessage?: string;
}

export interface TaskLogPayload {
  taskId: string;
  log: string;
  level: 'info' | 'warn' | 'error';
}

export interface DownloadEventMap {
  'task:queued': (payload: { taskId: string; url: string }) => void;
  'task:started': (payload: { taskId: string; url: string }) => void;
  'task:progress': (payload: TaskProgressPayload) => void;
  'task:completed': (payload: TaskStatusPayload) => void;
  'task:failed': (payload: TaskStatusPayload) => void;
  'task:cancelled': (payload: { taskId: string }) => void;
  'task:log': (payload: TaskLogPayload) => void;
}
