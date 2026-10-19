/**
 * Vercel Function — aviso diario a Bing por IndexNow (19/10/2026)
 *
 * ChatGPT busca en internet a través de Bing. IndexNow le avisa a Bing (y a
 * Yandex, Seznam y Naver) qué páginas cambiaron, sin esperar a que pase el
 * robot. Lo corre el cron de vercel.json una vez por día: manda las fichas
 * editadas en los últimos 3 días, la guía en los dos idiomas y el catálogo.
 *
 * La clave es pública por diseño: es el archivo /<clave>.txt de la raíz,
 * que prueba que el sitio es nuestro. Para mandar TODAS las URLs de una vez
 * (la primera vez, o después de un cambio grande), desde la compu:
 *
 *   curl -s https://www.bairengroup.com/sitemap.xml | grep -o 'https://www.bairengroup.com[^<]*' \
 *     | python3 -c "import sys,json;print(json.dumps({'host':'www.bairengroup.com','key':'a5e1c035b5d9b4a5409177d57516a341','urlList':[l.strip() for l in sys.stdin]}))" \
 *     | curl -s -X POST https://api.indexnow.org/IndexNow -H 'Content-Type: application/json' -d @- -w '%{http_code}\n'
 *
 * Responde 200 o 202 si Bing lo tomó.
 */

const B = require('./_bairen');

const KEY = 'a5e1c035b5d9b4a5409177d57516a341';
const DIAS = 3;

module.exports = async (req, res) => {
  // Solo el cron de Vercel (o quien tenga CRON_SECRET, si está cargado)
  const secreto = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  const esCron = /vercel-cron/i.test(String(req.headers['user-agent'] || ''));
  if (secreto ? auth !== `Bearer ${secreto}` : !esCron) {
    res.statusCode = 401;
    return res.end('No autorizado');
  }

  const todas = await B.publicadas();
  if (!todas) {
    res.statusCode = 503;
    return res.end('Supabase no respondió');
  }
  const desde = Date.now() - DIAS * 864e5;
  const cambiadas = todas.filter(B.enCatalogo)
    .filter(p => new Date(p.updated_at || p.created_at).getTime() >= desde)
    .map(B.url);
  const urlList = [
    `${B.SITE_ROOT}/catalogo.html`,
    `${B.SITE_ROOT}/alquiler-amoblado-buenos-aires`,
    `${B.SITE_ROOT}/en/furnished-apartments-buenos-aires`,
    ...cambiadas,
  ];

  let estado = 0;
  try {
    const r = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: 'www.bairengroup.com', key: KEY, keyLocation: `${B.SITE_ROOT}/${KEY}.txt`, urlList }),
      signal: AbortSignal.timeout(8000),
    });
    estado = r.status;
  } catch (_) {}

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ indexnow: estado, enviadas: urlList.length, fichas: cambiadas.length }));
};
