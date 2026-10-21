import { Router } from 'express';
import { MediaController } from '../controllers/media.controller';

const router = Router();

router.post('/media/package', MediaController.getPackage);
router.post('/media/mirrors', MediaController.getMirrors);
router.post('/playlist/expand', MediaController.expandPlaylist);

export default router;
