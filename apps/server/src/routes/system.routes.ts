import { Router } from 'express';
import { SystemController } from '../controllers/system.controller';

const router = Router();

router.get('/status', SystemController.health);
router.get('/engine/health', SystemController.health);
router.get('/media/sample', SystemController.sample);
router.get('/platform-health', SystemController.platformHealth);

export default router;
