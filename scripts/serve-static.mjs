import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const OUT_DIR = join(process.cwd(), 'out');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(OUT_DIR, normalized);
}

function sendFile(filePath, res) {
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

if (!existsSync(OUT_DIR)) {
  console.error('Build output directory "out" not found. Run "npm run build" first.');
  process.exit(1);
}

const server = createServer((req, res) => {
  const rawPath = req.url || '/';
  const candidate = safePath(rawPath === '/' ? '/index.html' : rawPath);
  const indexFile = join(OUT_DIR, 'index.html');

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    sendFile(candidate, res);
    return;
  }

  // SPA fallback: serve index for unknown routes.
  if (existsSync(indexFile)) {
    sendFile(indexFile, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Static server is running on http://${HOST}:${PORT}`);
});

