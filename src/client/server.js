import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 8080;
// Serve built assets from dist/
const distPath = path.resolve(process.cwd(), 'dist');
const assetsPath = path.join(distPath, 'assets');
const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || '';

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
// Version info for quick verification
app.get('/__version', (req, res) => {
  res.json({ deployedAt: new Date().toISOString(), commit: commit || null });
});

// helpful basic headers
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Reels-Client');
  next();
});

// (Removed) legacy FiT widget redirect: Reels has no widget endpoints
// Optional API proxy for UAT/single-origin setups
const apiProxyTarget = process.env.API_PROXY_TARGET || process.env.VITE_API_URL || '';
if (apiProxyTarget) {
  app.use('/api', createProxyMiddleware({
    target: apiProxyTarget,
    changeOrigin: true,
    xfwd: true,
    logLevel: 'warn'
  }));
}
// Debug: list hashed assets referenced by index.html
app.get('/__assets', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    const html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const matches = Array.from(html.matchAll(/assets\/[^"]+/g)).map(m => m[0]);
    const assets = Array.from(new Set(matches));
    res.json({ assets });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Failed to read assets' });
  }
});

// Static assets (hashed) - cache for a long time
app.use('/assets', express.static(assetsPath, { immutable: true, etag: true, maxAge: '1y' }));

// Explicitly handle /index.html with strong no-cache (before static dist handler)
app.get('/index.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

// Other static files without long caching
app.use(express.static(distPath, { etag: true, maxAge: 0 }));

// Index (no cache)
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

// SPA fallback: always return index.html for unknown paths (also no cache)
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[client] listening on http://0.0.0.0:${port}`);
});
