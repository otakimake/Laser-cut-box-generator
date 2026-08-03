import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parser for SVG payload
  app.use(express.json({ limit: '20mb' }));

  // Global CORS Middleware - Ensures Access-Control-Allow-Origin: * for client-side fetching by Laser Driver
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // In-memory SVG store with timestamps for auto-cleanup
  const svgStore = new Map<string, { content: string; fileName: string; createdAt: number }>();

  // API route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hostedSvgsCount: svgStore.size });
  });

  // API route: Store SVG content and return public hosted URL path
  app.post('/api/svg', (req, res) => {
    try {
      const { svgContent, fileName } = req.body;
      if (!svgContent || typeof svgContent !== 'string') {
        return res.status(400).json({ error: 'svgContent is required and must be a string' });
      }

      const id = `svg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const name = fileName && typeof fileName === 'string' ? fileName : 'box_design.svg';
      
      svgStore.set(id, {
        content: svgContent,
        fileName: name,
        createdAt: Date.now()
      });

      // Cleanup items older than 24 hours
      const now = Date.now();
      for (const [key, item] of svgStore.entries()) {
        if (now - item.createdAt > 24 * 3600 * 1000) {
          svgStore.delete(key);
        }
      }

      return res.json({
        id,
        fileName: name,
        path: `/api/svg/${id}.svg`
      });
    } catch (err) {
      console.error('Error storing SVG:', err);
      return res.status(500).json({ error: 'Failed to store SVG' });
    }
  });

  // API route: Get raw SVG with Access-Control-Allow-Origin: *
  app.get('/api/svg/:filename', (req, res) => {
    const param = req.params.filename;
    const id = param.endsWith('.svg') ? param.slice(0, -4) : param;
    const item = svgStore.get(id);

    if (!item) {
      return res.status(404).send('SVG not found or has expired.');
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.fileName)}"`);
    return res.send(item.content);
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laser Box Builder server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
