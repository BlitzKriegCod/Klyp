import { Router } from 'express';
import { DownloadController } from '../controllers/download.controller';

const router = Router();

router.post('/download/start', DownloadController.start);
router.post('/download/cancel', DownloadController.cancel);
router.get('/download/status/:id', DownloadController.getStatus);
router.get('/download/file/*', DownloadController.serveFile);
router.get('/download/events', DownloadController.streamEvents);

export default router;
