import path from 'path';
import fs from 'fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './app';
import { PORT, HOST, ALT_PORT, IS_PRODUCTION, WORKSPACE_ROOT } from './config/env';
import { prewarmBinaries } from './config/binaries';

async function bootstrap() {
  await prewarmBinaries();

  const app = createApp();

  // Determine Vite client root directory
  const webAppDir = path.resolve(WORKSPACE_ROOT, 'apps/web');
  const clientRoot = fs.existsSync(path.join(webAppDir, 'index.html'))
    ? webAppDir
    : WORKSPACE_ROOT;

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      root: clientRoot,
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(clientRoot, 'dist'))
      ? path.join(clientRoot, 'dist')
      : path.resolve(WORKSPACE_ROOT, 'dist');

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Klyp] Dev Server running on http://${HOST}:${PORT}`);
  });

  if (ALT_PORT && ALT_PORT !== PORT) {
    try {
      app.listen(ALT_PORT, HOST, () => {
        console.log(`[Klyp] Server also listening on http://${HOST}:${ALT_PORT}`);
      });
    } catch (e) {
      console.warn(`[Klyp] Could not bind to alt port ${ALT_PORT}:`, e);
    }
  }
}

bootstrap().catch((err) => {
  console.error('[Klyp] Server failed to start:', err);
  process.exit(1);
});
