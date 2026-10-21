import { Router } from 'express';
import { SubtitlesController } from '../controllers/subtitles.controller';

const router = Router();

router.post('/subtitles/search', SubtitlesController.search);
router.post('/subtitles/download', SubtitlesController.download);

export default router;
