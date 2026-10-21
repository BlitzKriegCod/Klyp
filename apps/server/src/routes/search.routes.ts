import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router = Router();

router.get('/search/suggestions', SearchController.suggestions);
router.post('/search', SearchController.search);

export default router;
