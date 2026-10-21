import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { taskQueueWorker } from '../workers/taskQueueWorker';
import { downloadEventBus } from '../events/downloadEventBus';
import { DOWNLOADS_DIR } from '../config/env';
import { FileService } from '../services/file.service';

export class DownloadController {
  static async start(req: Request, res: Response) {
    const {
      taskId,
      url,
      quality = '1080p',
      format = 'mp4',
      extractAudio = false,
      audioFormat = 'mp3',
      embedThumbnail = true,
      embedMetadata = true,
      sponsorblock = false,
      subtitleDownload = false,
      subLang = 'en',
      proxy = '',
      cookiesPath = ''
    } = req.body;

    if (!taskId || !url) {
      return res.status(400).json({ error: 'taskId and url are required' });
    }

    const record = taskQueueWorker.startDownload({
      taskId,
      url,
      quality,
      format,
      extractAudio,
      audioFormat,
      embedThumbnail,
      embedMetadata,
      sponsorblock,
      subtitleDownload,
      subLang,
      proxy,
      cookiesPath
    });

    return res.json({
      success: true,
      taskId: record.id,
      status: record.status,
      progress: record.progress,
      speed: record.speed,
      eta: record.eta
    });
  }

  static cancel(req: Request, res: Response) {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId required' });

    taskQueueWorker.cancelDownload(taskId);
    return res.json({ success: true, taskId, status: 'stopped' });
  }

  static getStatus(req: Request, res: Response) {
    const rawId = req.params.id;
    const taskId = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    const record = taskQueueWorker.getTask(taskId);

    if (!record) {
      const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const diskFile = FileService.findOutputFile(`klyp_${safeTaskId}`);
      if (diskFile && fs.existsSync(diskFile)) {
        const fileName = path.basename(diskFile);
        const stats = fs.statSync(diskFile);
        return res.json({
          id: taskId,
          status: 'completed',
          progress: 100,
          speed: 'Finished',
          eta: '00:00',
          outputFileName: fileName,
          outputFileUrl: `/media/${encodeURIComponent(fileName)}`,
          downloadUrl: `/api/download/file/${encodeURIComponent(fileName)}`,
          fileSize: stats.size
        });
      }

      return res.json({
        id: taskId,
        status: 'queued',
        progress: 0,
        speed: '0 MB/s',
        eta: '--:--'
      });
    }

    return res.json({
      id: taskId,
      status: record.status,
      progress: record.progress,
      speed: record.speed,
      eta: record.eta,
      outputFileName: record.outputFileName,
      outputFileUrl: record.outputFileUrl,
      downloadUrl: record.downloadUrl,
      fileSize: record.fileSize,
      errorMessage: record.errorMessage
    });
  }

  static serveFile(req: Request, res: Response) {
    const rawParam = req.params[0] ? String(req.params[0]) : '';
    const decodedPath = decodeURIComponent(rawParam);
    const targetPath = path.resolve(DOWNLOADS_DIR, decodedPath);

    if (!targetPath.startsWith(DOWNLOADS_DIR) || !fs.existsSync(targetPath)) {
      return res.status(404).send('File not found');
    }

    const filename = path.basename(targetPath);
    res.download(targetPath, filename, (err) => {
      if (err) {
        console.error(`[DownloadController] Error sending download file:`, err);
      }
    });
  }

  static streamEvents(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onProgress = (payload: any) => {
      res.write(`event: progress\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const onCompleted = (payload: any) => {
      res.write(`event: completed\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const onFailed = (payload: any) => {
      res.write(`event: failed\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const onCancelled = (payload: any) => {
      res.write(`event: cancelled\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    downloadEventBus.on('task:progress', onProgress);
    downloadEventBus.on('task:completed', onCompleted);
    downloadEventBus.on('task:failed', onFailed);
    downloadEventBus.on('task:cancelled', onCancelled);

    req.on('close', () => {
      downloadEventBus.off('task:progress', onProgress);
      downloadEventBus.off('task:completed', onCompleted);
      downloadEventBus.off('task:failed', onFailed);
      downloadEventBus.off('task:cancelled', onCancelled);
    });
  }
}
