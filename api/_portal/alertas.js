/**
 * Alertas del portal en el servidor (módulo compartido; lo usa api/portal-diario.js).
 *
 * cumpleFiltros(fila, filtros)  replica D.filter de portal/js/data.js sobre una fila de
 *   portal.avisos (con publicadores(slug,tipo) embebido) y el objeto F que guarda
 *   buscar.html en portal.alertas.filtros. Claves cubiertas: op, tipo, zonas, q, pub, emp,
 *   reservadas, amb, dorm, banos, coch, pmin, pmax, expmax, m2min, m2max, antig, amen, cual,
 *   amoblado, dueno, video, hace. 'favs' no se puede replicar (los favoritos viven en el
 *   navegador) y se ignora; 'sort' y 'page' no filtran. clavesIgnoradas(filtros) lo informa.
 * alertasDeBusqueda() y alertasDePrecio() hacen el trabajo del cron y devuelven el detalle.
 *
 * Cuándo "entró" un aviso: max(publicado_en, created_at). publicado_en viene de la web
 * (created_at de la unidad) y puede ser muy anterior a la fecha en que el aviso llegó al
 * portal (sync caído, unidad publicada tarde); con created_at solo no se pierde ninguno.
 * Lo que ya se mandó se registra entero (todos los avisos nuevos de la alerta, no solo los
 * diez del mail) con on_conflict + ignore-duplicates sobre (alerta_id, aviso_id, precio):
 * dos corridas cruzadas del diario no mandan dos veces. Las consultas por lista de ids van
 * en lotes de 100 (la URL tiene límite) y las alertas se procesan de a 5 en paralelo.
 */
const A = require('./admin');
const { zonaDe, ZONAS_PORTAL } = require('./zonas');

const SLUG_VIEJO = { 'maxim-rentals': 'bairen' };   // igual que data.js, hasta que corra migracion-03
const CLAVES = ['op', 'tipo', 'zonas', 'q', 'pub', 'emp', 'reservadas', 'amb', 'dorm', 'banos', 'coch', 'pmin', 'pmax', 'expmax', 'm2min', 'm2max', 'antig', 'amen', 'cual', 'amoblado', 'dueno', 'video', 'hace'];
const NO_FILTRAN = ['sort', 'page', 'key', 'favs'];
const SELECT_AVISOS = 'id,codigo,slug,operacion,tipo,titulo,direccion,unidad,barrio,zona,precio,moneda,expensas,m2_total,ambientes,dormitorios,banos,cocheras,antiguedad,amoblado,amenities,cualidades_verificadas,descripcion,video_url,estado,publicado_en,created_at,publicadores(slug,tipo)';
const LOTE = 100;        // ids por consulta con in.(...)
const PARALELO = 5;      // alertas procesadas a la vez
const PRECIO_BUSQUEDA = 0;   // precio de alertas_enviadas en las alertas de búsqueda (la migración 04 lo deja not null default 0)

const activa = v => Array.isArray(v) ? v.length > 0 : !!v;
/* Claves del filtro que el servidor no puede aplicar y están activas. */
function clavesIgnoradas(f) { return Object.keys(f || {}).filter(k => CLAVES.indexOf(k) === -1 && NO_FILTRAN.indexOf(k) === -1 && activa(f[k])); }

/* Fila de la base → lo que D.filter mira (mismos nombres que fromStore). */
function modelo(r) {
  const pub = r.publicadores || r.publicador || {};
  const pubId = SLUG_VIEJO[pub.slug] || pub.slug || r.publicador_id || 'bairen';
  const zona = zonaDe(r.barrio) || r.zona || r.barrio;
  const dias = r.publicado_en ? Math.max(0, Math.floor((Date.now() - Date.parse(r.publicado_en)) / 864e5)) : null;
  return {
    op: r.operacion, tipoProp: r.tipo || 'Departamento', zona, precio: r.precio == null ? null : Number(r.precio), expensas: r.expensas == null ? null : Number(r.expensas),
    amb: r.ambientes || null, dorm: r.dormitorios || null, banos: r.banos || null, cocheras: r.cocheras || 0, m2: r.m2_total || null, antiguedad: r.antiguedad == null ? null : Number(r.antiguedad),
    amenities: r.amenities || [], cualidades: r.cualidades_verificadas || [], amoblado: !!r.amoblado, video: !!r.video_url, reservado: r.estado === 'reservado',
    publicadorId: pubId, pubTipo: pub.tipo || 'inmobiliaria', dias,
    texto: [r.titulo || (r.direccion + (r.unidad ? ' · ' + r.unidad : '')), r.direccion, r.barrio, zona, r.descripcion, (r.amenities || []).join(' '), (r.cualidades_verificadas || []).join(' ')].join(' ').toLowerCase(),
  };
}
/* D.opMatch: 'alquiler' abarca mediano y largo; 'largo' es solo largo (op 'alquiler'). */
const opMatch = (a, op) => !op || (op === 'alquiler' ? a.op !== 'venta' : op === 'largo' ? a.op === 'alquiler' : a.op === op);

/* Misma semántica que D.filter (portal/js/data.js), más el nicho: fuera de ZONAS_PORTAL no se publica. */
function cumpleFiltros(fila, f) {
  f = f || {};
  const a = fila.texto != null ? fila : modelo(fila);
  if (ZONAS_PORTAL.indexOf(a.zona) === -1) return false;
  if (!f.reservadas && a.reservado) return false;
  if (f.op && !opMatch(a, f.op)) return false;
  if (f.tipo && f.tipo !== 'todos' && a.tipoProp.toLowerCase() !== String(f.tipo).toLowerCase()) return false;
  if (f.zonas && f.zonas.length && f.zonas.indexOf(a.zona) === -1) return false;
  if (f.pmin && (a.precio || 0) < f.pmin) return false;
  if (f.pmax && (a.precio || 0) > f.pmax) return false;
  if (f.expmax && a.expensas && a.expensas > f.expmax) return false;
  if (f.amb && (a.amb || 0) < f.amb) return false;
  if (f.dorm && (a.dorm || 0) < f.dorm) return false;
  if (f.banos && (a.banos || 0) < f.banos) return false;
  if (f.coch && (a.cocheras || 0) < f.coch) return false;
  if (f.m2min && (a.m2 || 0) < f.m2min) return false;
  if (f.m2max && a.m2 && a.m2 > f.m2max) return false;
  if (f.antig && a.antiguedad != null && a.antiguedad > f.antig) return false;
  if (f.amen && f.amen.length && !f.amen.every(x => a.amenities.indexOf(x) > -1)) return false;
  if (f.cual && f.cual.length && !f.cual.every(x => a.cualidades.indexOf(x) > -1)) return false;
  if (f.amoblado && !a.amoblado) return false;
  if (f.dueno && a.pubTipo !== 'dueno') return false;
  if (f.pub && a.publicadorId !== f.pub) return false;
  if (f.emp && a.pubTipo !== 'desarrolladora') return false;
  if (f.video && !a.video) return false;
  if (f.hace && (a.dias == null || a.dias > f.hace)) return false;
  if (f.q) { const q = String(f.q).toLowerCase(); if (a.texto.indexOf(q) === -1) return false; }
  return true;
}

const precioTexto = r => r.precio == null ? 'Consultar precio' : `${r.moneda || 'USD'} ${Number(r.precio).toLocaleString('es-AR', { maximumFractionDigits: 0 })}${r.operacion === 'venta' ? '' : ' por mes'}`;
const tituloDe = r => r.titulo || (r.direccion + (r.unidad ? ' · ' + r.unidad : ''));
const filaHTML = r => `<tr><td style="padding:10px 0;border-bottom:1px solid #E8E2D3"><a href="${A.linkFicha(r.id)}" style="color:#131D2D;text-decoration:none;font-weight:bold">${A.esc(tituloDe(r))}</a><br><span style="color:#6B7589;font-size:13px">${A.esc(r.barrio)} · ${A.esc(precioTexto(r))}</span></td></tr>`;
const inList = ids => `in.(${ids.map(encodeURIComponent).join(',')})`;
const iso = t => new Date(t).toISOString();
/* Instante en que el aviso entró: el mayor entre publicado_en y created_at. */
const instanteDe = r => Math.max(Date.parse(r.publicado_en) || 0, Date.parse(r.created_at) || 0);
/* fn(idsDelLote) → filas; concatena los resultados de lotes de LOTE ids. */
async function enLotes(ids, fn, n) { n = n || LOTE; let out = []; for (let i = 0; i < ids.length; i += n) out = out.concat(await fn(ids.slice(i, i + n))); return out; }
/* fn(item) para cada item, con a lo sumo n en vuelo a la vez, en orden de arranque. */
async function enParalelo(items, n, fn) { let i = 0; const w = async () => { while (i < items.length) await fn(items[i++]); }; await Promise.all(Array.from({ length: Math.min(n || PARALELO, items.length) }, w)); }
/* Registro de lo enviado, tolerando duplicados (índice único alerta_id, aviso_id, precio). */
const registrarEnviadas = filas => A.post(`alertas_enviadas?on_conflict=alerta_id,aviso_id,precio`, filas, { prefer: 'resolution=ignore-duplicates, return=minimal' });

/* Paso b del cron: alertas de búsqueda. Devuelve {alertas, enviadas, avisos, sin_mail, ignoradas, errores}. */
async function alertasDeBusqueda(opts) {
  opts = opts || {};
  const out = { alertas: 0, enviadas: 0, avisos: 0, sin_mail: 0, ignoradas: {}, errores: [] };
  const alertas = await A.get('alertas?select=id,usuario_id,tipo,filtros,frecuencia,created_at,ultimo_envio&tipo=eq.busqueda&frecuencia=in.(diaria,inmediata)&order=created_at.asc');
  out.alertas = alertas.length;
  if (!alertas.length) return out;
  const desdeDe = al => Date.parse(al.ultimo_envio || al.created_at) || 0;
  const minDesde = encodeURIComponent(iso(Math.min.apply(null, alertas.map(desdeDe))));
  const avisos = await A.get(`avisos?select=${SELECT_AVISOS}&estado_curacion=eq.publicado&or=(publicado_en.gt.${minDesde},created_at.gt.${minDesde})&order=publicado_en.desc&limit=500`);
  if (!avisos.length) return out;
  const enviadas = await enLotes(alertas.map(a => a.id), ids => A.get(`alertas_enviadas?select=alerta_id,aviso_id&alerta_id=${inList(ids)}&precio=eq.${PRECIO_BUSQUEDA}`));
  const ya = new Set(enviadas.map(e => e.alerta_id + '|' + e.aviso_id));
  const modelos = avisos.map(r => Object.assign(modelo(r), { fila: r, instante: instanteDe(r) }));
  const mails = {};   // por usuario, la promesa del mail: no se pide dos veces ni en paralelo
  await enParalelo(alertas, PARALELO, async al => {
    try {
      const f = al.filtros || {};
      clavesIgnoradas(f).forEach(k => { out.ignoradas[k] = (out.ignoradas[k] || 0) + 1; });
      const desde = desdeDe(al);
      const nuevos = modelos.filter(m => m.instante > desde && !ya.has(al.id + '|' + m.fila.id) && cumpleFiltros(m, f)).map(m => m.fila);
      if (!nuevos.length) return;
      if (!(al.usuario_id in mails)) mails[al.usuario_id] = A.emailDeUsuario(al.usuario_id).catch(() => null);
      const to = await mails[al.usuario_id];
      if (!to) { out.sin_mail++; return; }
      const lista = nuevos.slice(0, 10);
      const subject = `BAIREN · ${nuevos.length} ${nuevos.length === 1 ? 'propiedad nueva' : 'propiedades nuevas'} para tu búsqueda`;
      const html = A.plantilla(`<h2 style="">${nuevos.length === 1 ? 'Entró una propiedad como la que buscás' : 'Entraron ' + nuevos.length + ' propiedades como la que buscás'}</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lista.map(filaHTML).join('')}</table>${nuevos.length > 10 ? `<p style="color:#6B7589;font-size:13px">Te mostramos las primeras diez.</p>` : ''}<p style="margin-top:22px"><a href="${A.SITE}panel#alertas" class="btn">Ver mis alertas</a></p><p style="color:#6B7589;font-size:12px">Recibís este mail porque creaste una alerta en BAIREN. Se quita desde el panel.</p>`);
      const text = lista.map(r => `${tituloDe(r)} · ${r.barrio} · ${precioTexto(r)}\n${A.linkFicha(r.id)}`).join('\n\n');
      const env = opts.simular ? { enviado: false, motivo: 'simulado' } : await A.enviarMail({ to, subject, html, text });
      if (!env.enviado) { out.errores.push({ alerta: al.id, motivo: env.motivo }); if (env.motivo === 'sin RESEND_API_KEY' || env.motivo === 'simulado') { out.avisos += lista.length; } return; }
      out.enviadas++; out.avisos += lista.length;
      /* Se registran TODOS los nuevos (no solo los diez del mail): lo que no entró en este mail tampoco se vuelve a mandar en el próximo. */
      try { await registrarEnviadas(nuevos.map(r => ({ alerta_id: al.id, aviso_id: r.id, precio: PRECIO_BUSQUEDA }))); } catch (e) { out.errores.push({ alerta: al.id, motivo: 'registro: ' + e.message }); }
      try { await A.patch(`alertas?id=eq.${al.id}`, { ultimo_envio: iso(Date.now()) }, { prefer: 'return=minimal' }); } catch (e) { out.errores.push({ alerta: al.id, motivo: 'ultimo_envio: ' + e.message }); }
    } catch (e) { out.errores.push({ alerta: al.id, motivo: String(e.message || e).slice(0, 200) }); }
  });
  return out;
}

/* Paso c del cron: alertas de precio. Se mira solo el ÚLTIMO cambio de precio de cada aviso en las últimas 24 h:
   si es una baja se avisa (una vez por precio: se vuelve a avisar solo si baja de nuevo); si bajó y volvió a subir, no.
   Solo avisos publicados: el disparador registra también en pausados o rechazados. */
async function alertasDePrecio(opts) {
  opts = opts || {};
  const out = { alertas: 0, bajas: 0, enviadas: 0, sin_mail: 0, errores: [] };
  const alertas = await A.get('alertas?select=id,usuario_id,aviso_id,frecuencia&tipo=eq.precio&aviso_id=not.is.null&frecuencia=neq.ninguna');
  out.alertas = alertas.length;
  if (!alertas.length) return out;
  const hist = await A.get(`precios_historial?select=aviso_id,anterior,precio,moneda,registrado_en&registrado_en=gte.${encodeURIComponent(iso(Date.now() - 24 * 3600 * 1000))}&order=registrado_en.desc`);
  const ultimo = {};   // aviso_id → la fila más reciente de las últimas 24 h (viene ordenado por registrado_en desc)
  for (const h of hist) { if (!(h.aviso_id in ultimo)) ultimo[h.aviso_id] = h; }
  const bajaDe = {};   // aviso_id → esa fila, solo si es una baja
  for (const id in ultimo) { const h = ultimo[id]; if (h.anterior != null && Number(h.precio) < Number(h.anterior)) bajaDe[id] = h; }
  out.bajas = Object.keys(bajaDe).length;
  if (!out.bajas) return out;
  const enviadas = await enLotes(alertas.map(a => a.id), ids => A.get(`alertas_enviadas?select=alerta_id,aviso_id,precio&alerta_id=${inList(ids)}&precio=gt.${PRECIO_BUSQUEDA}`));
  const ya = new Set(enviadas.map(e => e.alerta_id + '|' + e.aviso_id + '|' + Number(e.precio)));
  const avisos = await enLotes(Object.keys(bajaDe), ids => A.get(`avisos?select=id,titulo,direccion,unidad,barrio,operacion,moneda,precio&estado_curacion=eq.publicado&id=${inList(ids)}`));
  const porId = new Map(avisos.map(a => [a.id, a]));
  const mails = {};
  await enParalelo(alertas, PARALELO, async al => {
    try {
      const b = bajaDe[al.aviso_id]; const r = porId.get(al.aviso_id);
      if (!b || !r || ya.has(al.id + '|' + al.aviso_id + '|' + Number(b.precio))) return;
      if (!(al.usuario_id in mails)) mails[al.usuario_id] = A.emailDeUsuario(al.usuario_id).catch(() => null);
      const to = await mails[al.usuario_id];
      if (!to) { out.sin_mail++; return; }
      const titulo = tituloDe(r);
      const fmt = n => `${b.moneda || r.moneda || 'USD'} ${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
      const subject = `BAIREN · Bajó de precio: ${titulo}`;
      const html = A.plantilla(`<h2 style="">Bajó de precio</h2><p><b>${A.esc(titulo)}</b><br><span style="color:#6B7589">${A.esc(r.barrio)}</span></p><p>Antes: <span style="text-decoration:line-through">${A.esc(fmt(b.anterior))}</span><br>Ahora: <b>${A.esc(fmt(b.precio))}</b>${r.operacion === 'venta' ? '' : ' por mes'}</p><p style="margin-top:22px"><a href="${A.linkFicha(r.id)}" class="btn">Ver la ficha</a></p><p style="color:#6B7589;font-size:12px">Recibís este mail porque pediste que te avisemos si baja de precio. Se quita desde el panel.</p>`);
      const text = `${titulo} · ${r.barrio}\nAntes: ${fmt(b.anterior)}\nAhora: ${fmt(b.precio)}\n${A.linkFicha(r.id)}`;
      const env = opts.simular ? { enviado: false, motivo: 'simulado' } : await A.enviarMail({ to, subject, html, text });
      if (!env.enviado) { out.errores.push({ alerta: al.id, motivo: env.motivo }); return; }
      out.enviadas++;
      try { await registrarEnviadas([{ alerta_id: al.id, aviso_id: al.aviso_id, precio: b.precio }]); } catch (e) { out.errores.push({ alerta: al.id, motivo: 'registro: ' + e.message }); }
    } catch (e) { out.errores.push({ alerta: al.id, motivo: String(e.message || e).slice(0, 200) }); }
  });
  return out;
}

module.exports = { cumpleFiltros, clavesIgnoradas, modelo, opMatch, alertasDeBusqueda, alertasDePrecio, precioTexto, tituloDe, CLAVES, _interno: { enLotes, enParalelo, instanteDe, LOTE, PARALELO, PRECIO_BUSQUEDA } };
