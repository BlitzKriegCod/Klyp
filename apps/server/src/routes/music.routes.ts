import { Router } from 'express';
import { MusicController } from '../controllers/music.controller';

const router = Router();

router.get('/music/search', MusicController.search);
router.get('/music/artist/:id/discography', MusicController.getDiscography);
router.get('/music/album/:id/tracks', MusicController.getTracks);
router.get('/music/stream', MusicController.stream);
router.post('/music/download/batch', MusicController.downloadBatch);

export default router;
