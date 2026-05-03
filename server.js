const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT       = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY   = 1 * 1024 * 1024; // 1 MB — evita OOM por payloads gigantes

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
};

// Cabeceras de seguridad añadidas a todas las respuestas estáticas y de API
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'SAMEORIGIN',
  'X-XSS-Protection':       '1; mode=block',
  'Referrer-Policy':         'same-origin',
};

function proxyToN8n(req, res, targetPath) {
  const chunks = [];
  let size = 0;

  req.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_BODY) {
      req.destroy();
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload demasiado grande' }));
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    const body    = Buffer.concat(chunks);
    const headers = { ...req.headers, host: 'localhost' };
    headers['content-length'] = body.length;
    delete headers['transfer-encoding'];

    const options = {
      hostname: 'localhost',
      port:     5678,
      path:     targetPath,
      method:   req.method,
      headers,
    };

    const proxy = http.request(options, (n8nRes) => {
      const resChunks = [];
      n8nRes.on('data', chunk => resChunks.push(chunk));
      n8nRes.on('end', () => {
        res.writeHead(n8nRes.statusCode, {
          'Content-Type':                n8nRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(Buffer.concat(resChunks));
      });
    });

    proxy.on('error', () => {
      // No exponer detalles internos del error al cliente
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'n8n no disponible' }));
    });

    proxy.write(body);
    proxy.end();
  });
}

const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;
  console.log(`[${req.method}] ${pathname}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Proxy al webhook de n8n
  if (pathname.startsWith('/webhook/') || pathname.startsWith('/webhook-test/')) {
    proxyToN8n(req, res, pathname);
    return;
  }

  // Lista flows con metadatos (solo nombre, path webhook y nombre de fichero)
  if (pathname === '/api/flows' && req.method === 'GET') {
    const flowsDir = path.join(PUBLIC_DIR, 'flows');
    fs.readdir(flowsDir, (err, files) => {
      if (err) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return; }
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      if (jsonFiles.length === 0) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return; }
      const results = [];
      let pending = jsonFiles.length;
      jsonFiles.forEach(file => {
        fs.readFile(path.join(flowsDir, file), 'utf8', (err, content) => {
          if (!err) {
            try {
              const flow        = JSON.parse(content);
              const webhookNode = (flow.nodes || []).find(n => n.type === 'n8n-nodes-base.webhook');
              const webhookPath = webhookNode ? '/webhook/' + webhookNode.parameters.path : null;
              // Solo exponer los campos necesarios, nunca el JSON completo aquí
              results.push({ file, name: flow.name || file, webhookPath });
            } catch { results.push({ file, name: file, webhookPath: null }); }
          }
          if (--pending === 0) {
            results.sort((a, b) => a.name.localeCompare(b.name));
            res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
          }
        });
      });
    });
    return;
  }

  // Ficheros estáticos — con protección contra path traversal
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!path.extname(filePath)) filePath += '.html';

  // Garantiza que el path resuelto se queda dentro de public/
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== PUBLIC_DIR) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[path.extname(resolved)] || 'text/plain',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web app corriendo en http://0.0.0.0:${PORT}`);
});
