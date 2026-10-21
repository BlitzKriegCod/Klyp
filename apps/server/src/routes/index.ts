import { Router } from 'express';
import extractRoutes from './extract.routes';
import searchRoutes from './search.routes';
import mediaRoutes from './media.routes';
import downloadRoutes from './download.routes';
import musicRoutes from './music.routes';
import subtitlesRoutes from './subtitles.routes';
import systemRoutes from './system.routes';

const apiRouter = Router();

apiRouter.use(extractRoutes);
apiRouter.use(searchRoutes);
apiRouter.use(mediaRoutes);
apiRouter.use(downloadRoutes);
apiRouter.use(musicRoutes);
apiRouter.use(subtitlesRoutes);
apiRouter.use(systemRoutes);

export default apiRouter;
