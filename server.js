const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const N8N_BASE = 'http://localhost:5678';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

function proxyToN8n(req, res, targetPath) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers, host: 'localhost' };
    headers['content-length'] = body.length;
    delete headers['transfer-encoding'];

    const options = {
      hostname: 'localhost',
      port: 5678,
      path: targetPath,
      method: req.method,
      headers,
    };
    const proxy = http.request(options, (n8nRes) => {
      const resChunks = [];
      n8nRes.on('data', chunk => resChunks.push(chunk));
      n8nRes.on('end', () => {
        const data = Buffer.concat(resChunks);
        res.writeHead(n8nRes.statusCode, {
          'Content-Type': n8nRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    });
    proxy.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'n8n no disponible: ' + e.message }));
    });
    proxy.write(body);
    proxy.end();
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  console.log(`[${req.method}] ${pathname} | CT: ${req.headers['content-type'] || '-'}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  // Proxy al webhook de n8n (producción y test)
  if (pathname.startsWith('/webhook/') || pathname.startsWith('/webhook-test/')) {
    proxyToN8n(req, res, pathname);
    return;
  }

  // Lista los flows disponibles en public/flows/ con sus metadatos
  if (pathname === '/api/flows' && req.method === 'GET') {
    const flowsDir = path.join(__dirname, 'public', 'flows');
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
              const flow = JSON.parse(content);
              const webhookNode = (flow.nodes || []).find(n => n.type === 'n8n-nodes-base.webhook');
              const webhookPath = webhookNode ? '/webhook/' + webhookNode.parameters.path : null;
              results.push({ file, name: flow.name || file, webhookPath });
            } catch { results.push({ file, name: file, webhookPath: null }); }
          }
          if (--pending === 0) {
            results.sort((a, b) => a.name.localeCompare(b.name));
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(results));
          }
        });
      });
    });
    return;
  }

  // Servir ficheros estáticos
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  if (!ext) filePath += '.html';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web app corriendo en http://0.0.0.0:${PORT}`);
});
