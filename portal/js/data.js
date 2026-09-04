/* BAIREN · Portal (prueba) · capa de datos.
   Lee las unidades reales publicadas (data/avisos-src.json, exportadas de Supabase el 3/9/2026)
   y las convierte al modelo de aviso del portal, con su publicador. Cuando exista el esquema
   `portal` en Supabase, esta capa se reemplaza por consultas a portal.avisos y portal.publicadores. */
(function(){
  'use strict';
  const BP = window.BP;
  const D = {};

  D.PUBLICADORES = {
    'maxim-rentals': { id:'maxim-rentals', tipo:'inmobiliaria', nombre:'Maxim Rentals', responsable:'Maximiliano Matzkin', matricula:'CUCICBA 7527', colegio:'Colegio Único de Corredores Inmobiliarios de la Ciudad de Buenos Aires', badge:'Corredor inmobiliario matriculado', verificado:true, desde:'2026', inicial:'MR',
      whatsapp:null, email:null, telefono:null, zonas:['Recoleta','Palermo','Núñez','Puerto Madero','Belgrano'],
      desc:'Oficina de corretaje a cargo de Maximiliano Matzkin. Intermedia y concluye cada operación que publica en BAIREN.' },
    'inmobiliaria-ejemplo': { id:'inmobiliaria-ejemplo', tipo:'inmobiliaria', nombre:'Inmobiliaria Ejemplo', responsable:'Corredor de ejemplo', matricula:'CUCICBA 0000', badge:'Corredor inmobiliario matriculado', verificado:true, desde:'2026', inicial:'IE', demo:true,
      whatsapp:'5491100000000', email:'ejemplo@ejemplo.com', telefono:'+54 11 0000 0000', zonas:['Belgrano'], desc:'Publicador de ejemplo para mostrar cómo se ve una inmobiliaria con perfil propio. No es una empresa real.' },
    'desarrolladora-ejemplo': { id:'desarrolladora-ejemplo', tipo:'desarrolladora', nombre:'Desarrolladora Ejemplo', responsable:'Equipo comercial', matricula:null, badge:'Venta directa', verificado:true, desde:'2026', inicial:'DE', demo:true,
      whatsapp:'5491100000002', email:'ventas@ejemplo.com', telefono:'+54 11 0000 0002', zonas:['Núñez'], desc:'Publicador de ejemplo: una desarrolladora que vende sus propias unidades, sin corretaje. No es una empresa real.' },
    'dueno-ejemplo': { id:'dueno-ejemplo', tipo:'dueno', nombre:'Dueño directo', responsable:'Propietario verificado', matricula:null, badge:'Dueño verificado', verificado:true, desde:'2026', inicial:'DD', demo:true,
      whatsapp:'5491100000001', email:'dueno@ejemplo.com', telefono:'+54 11 0000 0001', zonas:['Núñez'], desc:'Publicador de ejemplo: un propietario que muestra su propia unidad con titularidad verificada por BAIREN.' },
  };
  D.pub = id => D.PUBLICADORES[id] || D.PUBLICADORES['maxim-rentals'];

  const AMEN_MAP = { 'Aire acond.':'Aire acondicionado', 'Jardín / Terraza':'Terraza o jardín' };
  const norm = a => AMEN_MAP[a] || a;

  function fromUnit(p, op, precio){
    const fotos = (p.imagenes||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).map(i=>i.url);
    if (p.portada_url && fotos.indexOf(p.portada_url)===-1) fotos.unshift(p.portada_url);
    const amen = (p.amenities||[]).map(a=>norm(a.nombre)).filter(Boolean);
    const amb = p.ambientes || null;
    const zona = (window.BairenZonas && window.BairenZonas.zonaDe(p.barrio)) || p.barrio;
    const reservado = p.estado === 'Reservado' || p.estado === 'Ocupado';
    return {
      id: p.slug + '-' + op, slug: p.slug, op, tipoProp: 'Departamento',
      dir: p.dir, unidad: p.unidad && p.unidad !== '-' ? p.unidad : '',
      titulo: p.portada_titulo || (p.dir + (p.unidad && p.unidad !== '-' ? ' · ' + p.unidad : '')),
      barrio: p.barrio, zona, ciudad: zona === 'GBA Norte' ? 'Zona Norte' : 'Capital Federal',
      precio, moneda:'USD', periodo: op === 'venta' ? '' : '/mes', expensas: null,
      m2: p.m2 || null, m2cub: p.m2 || null, amb,
      dorm: amb == null ? null : Math.max(1, amb - 1), banos: amb == null ? null : (amb >= 4 ? 2 : 1),
      cocheras: amen.indexOf('Cochera') > -1 ? 1 : 0, antiguedad: null,
      amoblado: op === 'mediano' || amen.indexOf('Amoblado') > -1, amenities: amen,
      fotos, video: p.video_url ? { tipo: p.video_tipo, url: p.video_url } : null,
      descripcion: p.descripcion || '', plazo: p.plazo || '',
      publicadoEn: p.created_at, estado: p.estado, reservado, fechaLiberacion: p.fecha_liberacion,
      publicadorId: 'maxim-rentals', destacado: false, demo: false, codigo: 'BA-' + (p.slug||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) + (op==='venta'?'V':op==='alquiler'?'L':'M'),
      apto: op === 'venta' ? ['Apto crédito'] : ['Contrato digital', 'Sin garantía propietaria'],
    };
  }

  function demoAvisos(real){
    const base = real.find(a => a.zona === 'Belgrano') || real[0]; const base2 = real.find(a => a.zona === 'Núñez') || real[1] || real[0];
    const now = new Date(Date.now() - 3*864e5).toISOString();
    return [
      Object.assign({}, base, { id:'ejemplo-venta-belgrano', slug:'ejemplo-venta-belgrano', op:'venta', dir:'Juramento al 2400', unidad:'', titulo:'Juramento al 2400 · Piso alto con vista', barrio:'Belgrano', zona:'Belgrano', ciudad:'Capital Federal', precio:295000, periodo:'', expensas:210000, m2:96, m2cub:88, amb:3, dorm:2, banos:2, cocheras:1, antiguedad:12, amoblado:false, amenities:['Pileta','Gimnasio','SUM','Seguridad 24hs','Cochera'], descripcion:'Aviso de ejemplo para mostrar cómo publica una inmobiliaria con perfil propio en BAIREN. Las fotos son ilustrativas. Tres ambientes al contrafrente con balcón corrido, cocina integrada y toilette de recepción. Edificio con amenities completos y cochera fija.', publicadoEn: now, estado:'Disponible', reservado:false, publicadorId:'inmobiliaria-ejemplo', destacado:true, demo:true, codigo:'BA-EJEMPLO1V', apto:['Apto crédito'], video:null }),
      Object.assign({}, base2, { id:'ejemplo-emp-nunez-1', slug:'ejemplo-emp-nunez-1', op:'venta', dir:'Av. del Libertador al 7200', unidad:'4° A', titulo:'Torre Ejemplo Núñez · 2 ambientes con balcón al río', barrio:'Núñez', zona:'Núñez', ciudad:'Capital Federal', precio:185000, periodo:'', expensas:null, m2:58, m2cub:52, amb:2, dorm:1, banos:1, cocheras:0, antiguedad:0, amoblado:false, amenities:['Pileta','Gimnasio','SUM','Seguridad 24hs'], descripcion:'Unidad de ejemplo de un emprendimiento en construcción, publicada por la desarrolladora con venta directa. Las fotos son ilustrativas. Dos ambientes con balcón al río, cocina integrada y amenities en el último piso.', publicadoEn: now, estado:'Disponible', reservado:false, publicadorId:'desarrolladora-ejemplo', destacado:false, demo:true, codigo:'BA-EJEMPLO3V', apto:['Apto crédito','Entrega diciembre 2027'], video:null, emprendimiento:'Torre Ejemplo Núñez', etapa:'construccion', entrega:'Diciembre 2027' }),
      Object.assign({}, base2, { id:'ejemplo-emp-nunez-2', slug:'ejemplo-emp-nunez-2', op:'venta', dir:'Av. del Libertador al 7200', unidad:'12° C', titulo:'Torre Ejemplo Núñez · 3 ambientes en piso alto', barrio:'Núñez', zona:'Núñez', ciudad:'Capital Federal', precio:265000, periodo:'', expensas:null, m2:84, m2cub:76, amb:3, dorm:2, banos:2, cocheras:1, antiguedad:0, amoblado:false, amenities:['Pileta','Gimnasio','SUM','Seguridad 24hs','Cochera'], descripcion:'Unidad de ejemplo de un emprendimiento en construcción, publicada por la desarrolladora con venta directa. Las fotos son ilustrativas. Tres ambientes en piso alto con vista abierta, dos baños y cochera.', publicadoEn: now, estado:'Disponible', reservado:false, publicadorId:'desarrolladora-ejemplo', destacado:false, demo:true, codigo:'BA-EJEMPLO4V', apto:['Apto crédito','Entrega diciembre 2027'], video:null, emprendimiento:'Torre Ejemplo Núñez', etapa:'construccion', entrega:'Diciembre 2027' }),
      Object.assign({}, base2, { id:'ejemplo-alquiler-nunez', slug:'ejemplo-alquiler-nunez', op:'alquiler', dir:'Arcos al 3300', unidad:'', titulo:'Arcos al 3300 · Dos ambientes con terraza propia', barrio:'Núñez', zona:'Núñez', ciudad:'Capital Federal', precio:1450, periodo:'/mes', expensas:95000, m2:62, m2cub:52, amb:2, dorm:1, banos:1, cocheras:0, antiguedad:6, amoblado:false, amenities:['Terraza o jardín','Ascensor','Parrilla'], descripcion:'Aviso de ejemplo publicado por un dueño directo verificado. Las fotos son ilustrativas. Dos ambientes con terraza propia de 18 m², parrilla y orientación norte, a dos cuadras de la estación.', publicadoEn: now, estado:'Disponible', reservado:false, publicadorId:'dueno-ejemplo', destacado:false, demo:true, codigo:'BA-EJEMPLO2L', apto:['Contrato digital'], video:null }),
    ];
  }

  /* aviso del esquema portal (o del modo local) → modelo del portal */
  D.fromStore = async function(r){
    const pub = r.publicador || null; const pubId = pub ? (pub.slug || pub.id) : 'maxim-rentals';
    if (pub && !D.PUBLICADORES[pubId]) D.PUBLICADORES[pubId] = Object.assign({ storeId: pub.id, id: pubId, inicial: (pub.nombre||'P').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), desde: (pub.created_at||'').slice(0,4) || '2026', zonas: pub.zonas || [], desc: pub.descripcion || '', responsable: pub.responsable || pub.nombre, badge: pub.badge || (pub.tipo === 'dueno' ? 'Dueño verificado' : 'Corredor inmobiliario matriculado') }, pub, { id: pubId });
    const fotos = []; for (const f of (r.fotos||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0))) { const u = window.BPStore ? await window.BPStore.resolveFoto(f.url) : f.url; if (u) fotos.push(u); }
    const amb = r.ambientes || null;
    return { id: r.id, slug: r.slug, op: r.operacion, tipoProp: r.tipo || 'Departamento', dir: r.direccion, unidad: r.unidad || '', titulo: r.titulo || (r.direccion + (r.unidad ? ' · ' + r.unidad : '')), barrio: r.barrio, zona: r.zona || r.barrio, ciudad: r.ciudad || 'Capital Federal',
      precio: r.precio == null ? null : Number(r.precio), moneda: r.moneda || 'USD', periodo: r.operacion === 'venta' ? '' : '/mes', expensas: r.expensas == null ? null : Number(r.expensas),
      m2: r.m2_total || null, m2cub: r.m2_cubierto || null, amb, dorm: r.dormitorios || null, banos: r.banos || null, cocheras: r.cocheras || 0, antiguedad: r.antiguedad == null ? null : Number(r.antiguedad),
      amoblado: !!r.amoblado, amenities: r.amenities || [], caracteristicas: r.caracteristicas || [], fotos, video: r.video_url ? { tipo: r.video_tipo || 'youtube', url: r.video_url } : null,
      descripcion: r.descripcion || '', plazo: r.plazo || '', emprendimiento: r.emprendimiento || null, etapa: r.etapa || null, entrega: r.entrega || null, propietarioEmail: r.propietario_email || null, publicadoEn: r.publicado_en || r.created_at, estado: r.estado, reservado: r.estado === 'reservado', publicadorId: pubId, destacado: !!(r.destacado_hasta && new Date(r.destacado_hasta) > new Date()), demo: false, codigo: r.codigo, apto: r.caracteristicas && r.caracteristicas.length ? r.caracteristicas.slice(0,2) : (r.operacion === 'venta' ? ['Apto crédito'] : []), fromStore: true };
  };

  let cache = null;
  D.load = async function(){
    if (cache) return cache;
    const src = new URL('data/avisos-src.json', document.baseURI).href;
    const res = await fetch(src); const units = await res.json();
    const avisos = [];
    units.forEach(p => {
      if (p.precio_venta) avisos.push(fromUnit(p, 'venta', Number(p.precio_venta)));
      if (p.precio_tradicional) avisos.push(fromUnit(p, 'alquiler', Number(p.precio_tradicional)));
      if (p.precio_temporal) avisos.push(fromUnit(p, 'mediano', Number(p.precio_temporal)));
    });
    // "Seleccionadas de la semana": las 6 con más fotos y disponibles
    avisos.filter(a=>!a.reservado).sort((a,b)=>b.fotos.length-a.fotos.length).slice(0,6).forEach(a=>a.destacado=true);
    let extra = [];
    try { if (window.BPStore) { await window.BPStore.init(); const recs = await window.BPStore.publishedAvisos(); for (const r of recs) extra.push(await D.fromStore(r)); } } catch (e) { console.warn('store', e); }
    const all = extra.concat(avisos, demoAvisos(avisos));
    cache = { avisos: all, publicadores: D.PUBLICADORES };
    return cache;
  };

  D.metaLine = a => [
    a.m2 ? a.m2 + ' m² tot.' : null,
    a.amb ? (a.amb === 1 ? 'Monoamb.' : a.amb + ' amb.') : null,
    a.dorm ? a.dorm + ' dorm.' : null,
    a.banos ? a.banos + (a.banos === 1 ? ' baño' : ' baños') : null,
    a.cocheras ? a.cocheras + ' coch.' : null,
  ].filter(Boolean).join(' · ');
  D.opTag = a => a.op === 'venta' ? 'Venta' : a.op === 'mediano' ? 'Mediano plazo' : 'Alquiler';
  D.precioHTML = a => a.precio ? `${BP.fmtUSD(a.precio)}${a.periodo ? '<small>' + a.periodo + '</small>' : ''}` : 'Consultar precio';
  D.badgeHTML = pub => pub.tipo === 'dueno'
    ? `<span class="p-badge dueno">${BP.ico.shield} ${BP.esc(pub.badge || '')}</span>`
    : pub.tipo === 'desarrolladora' ? `<span class="p-badge dueno">${BP.ico.building} Venta directa</span>`
    : `<span class="p-badge">${BP.ico.shield} ${BP.esc(pub.matricula || '')}</span>`;
  D.waLink = (a, pub) => pub.whatsapp ? 'https://wa.me/' + pub.whatsapp + '?text=' + encodeURIComponent('Hola, vi ' + a.titulo + ' (' + a.codigo + ') en BAIREN y quiero más información.') : null;
  D.sinContacto = pub => !pub.whatsapp && !pub.email;

  D.cardH = function(a){
    const pub = D.pub(a.publicadorId);
    const href = BP.urlFicha(a);
    const foto = a.fotos[0] ? `<img src="${BP.sbImg(a.fotos[0], 900)}" alt="${BP.esc(a.titulo)}, ${BP.esc(a.barrio)}" loading="lazy">` : '';
    const tag = a.reservado ? '<span class="tag res">Reservada</span>' : a.destacado ? '<span class="tag">Seleccionada</span>' : a.demo ? '<span class="tag" style="background:#F4F0E6">Ejemplo</span>' : '';
    return `
<article class="p-card-h" data-id="${BP.esc(a.id)}">
  <a class="p-card-photo" href="${href}" aria-label="Ver ${BP.esc(a.titulo)}">${foto}${tag}<span class="ct">${BP.ico.photo} ${a.fotos.length}${a.video ? ' · ' + BP.ico.video : ''}</span></a>
  <div class="p-card-body">
    <div class="p-card-top"><div><div class="p-price">${D.precioHTML(a)}</div>${a.expensas ? `<div class="p-expensas">$ ${BP.fmtN(a.expensas)} expensas</div>` : ''}</div></div>
    <div class="p-meta">${D.metaLine(a).split(' · ').map(x=>`<span>${x}</span>`).join('')}</div>
    <a class="p-addr" href="${href}">${BP.esc(a.titulo)}</a>
    <div class="p-barrio">${BP.esc(a.barrio)}, ${BP.esc(a.ciudad)}</div>
    <p class="p-desc">${BP.esc(a.descripcion).slice(0, 220)}</p>
    <div class="p-card-foot">
      <div class="p-publine">Publica <b>${BP.esc(pub.nombre)}</b> ${D.badgeHTML(pub)}</div>
      <div class="acts">${D.waLink(a,pub) ? `<a class="p-icon-btn" href="${D.waLink(a,pub)}" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp a ${BP.esc(pub.nombre)}" title="WhatsApp">${BP.ico.wa}</a>` : ''}${D.sinContacto(pub) ? `<span class="p-sincontacto">Contacto pendiente</span>` : `<a class="p-btn p-btn-sm p-btn-navy" href="${href}#contacto">${BP.ico.mail} Contactar</a>`}</div>
    </div>
  </div>
  <button type="button" class="p-icon-btn p-fav ${BP.isFav(a.id)?'on':''}" data-fav="${BP.esc(a.id)}" aria-label="Guardar en favoritos" aria-pressed="${BP.isFav(a.id)}">${BP.isFav(a.id)?BP.ico.heartFill:BP.ico.heart}</button>
</article>`;
  };

  D.cardV = function(a){
    const pub = D.pub(a.publicadorId);
    const href = BP.urlFicha(a);
    const foto = a.fotos[0] ? `<img src="${BP.sbImg(a.fotos[0], 700)}" alt="${BP.esc(a.titulo)}, ${BP.esc(a.barrio)}" loading="lazy">` : '<span class="card-img-placeholder">Fotos en producción</span>';
    return `
<a class="prop-card" href="${href}" aria-label="Ver ${BP.esc(a.titulo)} en ${BP.esc(a.barrio)}">
  <div class="card-img">${foto}<span class="card-tag tag-${a.op}">${D.opTag(a)}</span>${a.reservado?'<span class="card-status status-reservado">Reservada</span>':''}</div>
  <div class="card-body">
    <div class="card-address">${BP.esc(a.titulo)}</div>
    <div class="card-barrio">${BP.esc(a.barrio)}</div>
    <div class="card-meta">${D.metaLine(a)}</div>
    <div class="card-divider"></div>
    <div class="card-footer"><div class="card-price"><span class="price-amount">${D.precioHTML(a)}</span></div><span class="card-cta">Ver ficha</span></div>
    <div class="p-card-pub">Publica <b>${BP.esc(pub.nombre)}</b> ${D.badgeHTML(pub)}</div>
  </div>
</a>`;
  };

  D.bindFavs = root => { (root||document).querySelectorAll('[data-fav]').forEach(b => { if (b._bound) return; b._bound = true; b.addEventListener('click', e => { e.preventDefault(); const on = BP.toggleFav(b.dataset.fav); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = on ? BP.ico.heartFill : BP.ico.heart; BP.toast(on ? 'Guardada en favoritos' : 'Quitada de favoritos'); }); }); };

  D.filter = function(avisos, f){
    return avisos.filter(a => {
      if (f.favs && !BP.isFav(a.id)) return false;
      if (!f.reservadas && a.reservado) return false;
      if (f.op && a.op !== f.op) return false;
      if (f.tipo && f.tipo !== 'todos' && a.tipoProp.toLowerCase() !== f.tipo) return false;
      if (f.zonas && f.zonas.length && f.zonas.indexOf(a.zona) === -1) return false;
      if (f.pmin && (a.precio||0) < f.pmin) return false;
      if (f.pmax && (a.precio||0) > f.pmax) return false;
      if (f.expmax && a.expensas && a.expensas > f.expmax) return false;
      if (f.amb && (a.amb||0) < f.amb) return false;
      if (f.dorm && (a.dorm||0) < f.dorm) return false;
      if (f.banos && (a.banos||0) < f.banos) return false;
      if (f.coch && (a.cocheras||0) < f.coch) return false;
      if (f.m2min && (a.m2||0) < f.m2min) return false;
      if (f.m2max && a.m2 && a.m2 > f.m2max) return false;
      if (f.antig && a.antiguedad != null && a.antiguedad > f.antig) return false;
      if (f.amen && f.amen.length && !f.amen.every(x => a.amenities.indexOf(x) > -1)) return false;
      if (f.amoblado && !a.amoblado) return false;
      if (f.dueno && D.pub(a.publicadorId).tipo !== 'dueno') return false;
      if (f.pub && a.publicadorId !== f.pub) return false;
      if (f.emp && D.pub(a.publicadorId).tipo !== 'desarrolladora') return false;
      if (f.video && !a.video) return false;
      if (f.hace && (BP.diasDesde(a.publicadoEn) == null || BP.diasDesde(a.publicadoEn) > f.hace)) return false;
      if (f.q) { const q = f.q.toLowerCase(); const hay = [a.titulo, a.dir, a.barrio, a.zona, a.descripcion, a.amenities.join(' ')].join(' ').toLowerCase(); if (hay.indexOf(q) === -1) return false; }
      return true;
    });
  };
  D.sort = function(list, key){
    const l = list.slice();
    const t = a => new Date(a.publicadoEn||0).getTime();
    if (key === 'precio_asc') l.sort((a,b)=>(a.precio||9e12)-(b.precio||9e12));
    else if (key === 'precio_desc') l.sort((a,b)=>(b.precio||0)-(a.precio||0));
    else if (key === 'recientes') l.sort((a,b)=>t(b)-t(a));
    else if (key === 'm2') l.sort((a,b)=>(b.m2||0)-(a.m2||0));
    else l.sort((a,b)=>(b.destacado-a.destacado)||(a.reservado-b.reservado)||(t(b)-t(a)));
    return l;
  };
  D.emprendimientos = avisos => { const g = {}; avisos.forEach(a => { if (!a.emprendimiento) return; const k = a.publicadorId + '|' + a.emprendimiento; (g[k] = g[k] || { key: k, nombre: a.emprendimiento, publicadorId: a.publicadorId, zona: a.zona, barrio: a.barrio, dir: a.dir, etapa: a.etapa, entrega: a.entrega, unidades: [] }).unidades.push(a); }); return Object.values(g).map(e => { const p = e.unidades.map(u => u.precio).filter(Boolean), m = e.unidades.map(u => u.m2).filter(Boolean), am = e.unidades.map(u => u.amb).filter(Boolean); e.desde = p.length ? Math.min.apply(null, p) : null; e.m2min = m.length ? Math.min.apply(null, m) : null; e.m2max = m.length ? Math.max.apply(null, m) : null; e.ambmin = am.length ? Math.min.apply(null, am) : null; e.ambmax = am.length ? Math.max.apply(null, am) : null; e.foto = (e.unidades.find(u => u.fotos.length) || {}).fotos; e.foto = e.foto ? e.foto[0] : null; return e; }); };
  D.countsByZona = (avisos, op) => { const c={}; avisos.forEach(a=>{ if (op && a.op !== op) return; if (a.reservado) return; c[a.zona]=(c[a.zona]||0)+1; }); return c; };
  D.countsByOp = avisos => { const c={ venta:0, alquiler:0, mediano:0 }; avisos.forEach(a => { if (!a.reservado && c[a.op] != null) c[a.op]++; }); return c; };
  D.opConMasInventario = avisos => { const c = D.countsByOp(avisos); return Object.keys(c).sort((a,b) => c[b]-c[a])[0]; };
  D.opsConUnidades = (avisos, zona) => { const r = {}; avisos.forEach(a => { if (a.reservado) return; if (zona && a.zona !== zona) return; r[a.op] = (r[a.op]||0)+1; }); return r; };

  window.BPData = D;
})();
