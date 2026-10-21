import { Router } from 'express';
import { ExtractController } from '../controllers/extract.controller';

const router = Router();

router.post('/extract', ExtractController.extractSingle);
router.post('/extract/batch', ExtractController.extractBatch);

export default router;
