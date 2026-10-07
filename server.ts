import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  handleExportInit,
  handleExportFrames,
  handleExportFinalize,
  handleExportDownload,
} from './server/api/export-mp4.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // High payload limit to support batch JPEG frame uploads and audio buffers
  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ extended: true, limit: '150mb' }));

  // VINSTOCK Motion Export FFmpeg API routes
  app.post('/api/export/init', handleExportInit);
  app.post('/api/export/frames', handleExportFrames);
  app.post('/api/export/finalize', handleExportFinalize);
  app.get('/api/export/download/:sessionId', handleExportDownload);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VINSTOCK Motion Export Prototype running at http://localhost:${PORT}`);
  });
}

startServer();
