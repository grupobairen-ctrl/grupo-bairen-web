/* Servidor local de la web de prueba con las mismas reescrituras que vercel.json (URLs limpias del portal).
   Uso: node portal/test/dev-server.mjs   →  http://localhost:8080/portal/  */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT = process.cwd(); const PORT = Number(process.env.PORT || 8080);
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.ico':'image/x-icon', '.woff2':'font/woff2', '.pdf':'application/pdf', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml' };
const REWRITES = [
  [/^\/portal\/_rewrite-probe$/, () => ({ probe: true })],
  [/^\/portal\/propiedad-[^/]+$/, () => ({ file: '/portal/propiedad.html' })],
  [/^\/portal\/(departamentos|pisos|ph|casas|propiedades)-(venta|alquiler-mediano-plazo|alquiler)-([a-z0-9-]+)$/, () => ({ file: '/portal/buscar.html' })],
  [/^\/portal\/(publicar|ingresar|panel|curacion|legales|publicadores|buscar|importar)$/, (m) => ({ file: '/portal/' + m[1] + '.html' })],
];
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); let path = decodeURIComponent(url.pathname);
  for (const [re, fn] of REWRITES) { const m = path.match(re); if (m) { const r = fn(m); if (r.probe) { res.writeHead(200, { 'x-bp-rewrite': '1' }); return res.end(); } path = r.file; break; } }
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path)); if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { const st = await stat(file); if (st.isDirectory()) { res.writeHead(301, { Location: url.pathname + '/' }); return res.end(); } const body = await readFile(file); res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(body); }
  catch (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado: ' + path); }
}).listen(PORT, '127.0.0.1', () => console.log('BAIREN dev server: http://127.0.0.1:' + PORT + '/portal/'));
