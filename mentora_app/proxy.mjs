import http from 'node:http';
import https from 'node:https';
import { parse } from 'node:url';

const TARGET = 'chat-five-rho-38.vercel.app';
const PORT = 3001;

http.createServer((req, res) => {
  const url = parse(req.url);
  const opts = {
    hostname: TARGET,
    port: 443,
    path: url.path,
    method: req.method,
    headers: { ...req.headers, host: TARGET },
    rejectUnauthorized: false,
  };
  const proxyReq = https.request(opts, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    headers['access-control-allow-origin'] = '*';
    headers['access-control-allow-headers'] = '*';
    headers['access-control-allow-methods'] = '*';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => { res.writeHead(502); res.end(e.message); });
  req.pipe(proxyReq);
}).listen(PORT, () => {
  console.log(`Proxy: http://localhost:${PORT} → https://${TARGET}`);
});
