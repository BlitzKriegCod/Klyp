import type { DownloadTask, DownloadStatus } from '../types';
export interface TaskQueuedEvent {
    taskId: string;
    task: DownloadTask;
    timestamp: string;
}
export interface TaskProgressEvent {
    taskId: string;
    progress: number;
    speed?: string;
    eta?: string;
    downloadedBytes?: number;
    totalBytes?: number;
}
export interface TaskStatusChangeEvent {
    taskId: string;
    status: DownloadStatus;
    outputPath?: string;
    errorMessage?: string;
    completedAt?: string;
}
export interface DownloadEventMap {
    'task:queued': TaskQueuedEvent;
    'task:progress': TaskProgressEvent;
    'task:status': TaskStatusChangeEvent;
    'task:completed': TaskStatusChangeEvent;
    'task:failed': TaskStatusChangeEvent;
    'task:cancelled': {
        taskId: string;
        timestamp: string;
    };
}
