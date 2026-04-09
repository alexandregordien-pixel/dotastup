const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function resolvePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const safePath = pathname === '/' ? '/public/index.html' : pathname;
  const absolutePath = path.normalize(path.join(ROOT, safePath));
  if (!absolutePath.startsWith(ROOT)) return null;
  return absolutePath;
}

const server = http.createServer((req, res) => {
  const absolutePath = resolvePath(req.url || '/');
  if (!absolutePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(absolutePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const extension = path.extname(absolutePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(content);
  });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

server.listen(port, host, () => {
  console.log(`dotastup disponible sur http://${host}:${port}`);
});
