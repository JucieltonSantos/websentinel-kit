import { createServer } from 'node:http';
const server = createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control', 'no-store');
  if (path === '/with-headers') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; x-secret-canary-csp");
    res.setHeader('Strict-Transport-Security', 'max-age=12345');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Set-Cookie', 'fixture=secret-canary-cookie; HttpOnly');
    res.setHeader('X-Synthetic-Secret', 'secret-canary-header');
  }
  if (path === '/resource.js') { res.setHeader('Content-Type', 'text/javascript'); res.end('void 0;'); return; }
  if (path === '/child') { res.end('Synthetic subframe'); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="en"><title>Headers fixture</title><p>Local synthetic fixture</p><iframe src="/child"></iframe><script src="/resource.js"></script></html>');
});
const port = Number(process.env.WSK_FIXTURE_PORT ?? 4179);
server.listen(port, '127.0.0.1', () => console.log(`Fixture listening on 127.0.0.1 port ${port}`));
