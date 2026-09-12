/* BAIREN · Portal (prueba) · capa de datos.
   Lee las unidades reales publicadas (data/avisos-src.json, exportadas de Supabase el 10/9/2026)
   y las convierte al modelo de aviso del portal, con su publicador. Cuando exista el esquema
   `portal` en Supabase, esta capa se reemplaza por consultas a portal.avisos y portal.publicadores. */
(function(){
  'use strict';
  const BP = window.BP;
  const D = {};

  const SLUG_VIEJO = { 'maxim-rentals': 'bairen' };   /* fila vieja de la base; se saca cuando corra migracion-03-portal-sin-corredor.sql */
  D.PUBLICADORES = {
    'bairen': { id:'bairen', tipo:'inmobiliaria', nombre:'BAIREN', responsable:null, matricula:null, colegio:null, badge:'Selección BAIREN', verificado:true, desde:'2026', inicial:'B', portal:true,
      whatsapp:'5491123106629', email:'contacto@bairengroup.com', telefono:null, zonas:['Recoleta','Palermo','Núñez','Puerto Madero','Belgrano'],
      desc:'Propiedad seleccionada por BAIREN: ubicación, estado, distribución y calidad constructiva revisados antes de publicarla.',
      desc_en:'Property selected by BAIREN: location, condition, layout and build quality reviewed before listing it.',
      desc_pt:'Imóvel selecionado pela BAIREN: localização, estado, distribuição e qualidade construtiva revisados antes de publicá-lo.' },
    'inmobiliaria-ejemplo': { id:'inmobiliaria-ejemplo', tipo:'inmobiliaria', nombre:'Inmobiliaria Ejemplo', responsable:'Corredor de ejemplo', matricula:'CUCICBA 0000', badge:'Corredor inmobiliario matriculado', verificado:true, desde:'2026', inicial:'IE', demo:true,
      whatsapp:'5491100000000', email:'ejemplo@ejemplo.com', telefono:'+54 11 0000 0000', zonas:['Belgrano'], desc:'Publicador de ejemplo para mostrar cómo se ve una inmobiliaria con perfil propio. No es una empresa real.',
      desc_en:'Sample lister to show how a real estate agency with its own profile looks. Not a real company.', desc_pt:'Anunciante de exemplo para mostrar como fica uma imobiliária com perfil próprio. Não é uma empresa real.' },
    'desarrolladora-ejemplo': { id:'desarrolladora-ejemplo', tipo:'desarrolladora', nombre:'Desarrolladora Ejemplo', responsable:'Equipo comercial', matricula:null, badge:'Venta directa', verificado:true, desde:'2026', inicial:'DE', demo:true,
      whatsapp:'5491100000002', email:'ventas@ejemplo.com', telefono:'+54 11 0000 0002', zonas:['Núñez'], desc:'Publicador de ejemplo: una desarrolladora que vende sus propias unidades, sin corretaje. No es una empresa real.',
      desc_en:'Sample lister: a developer selling its own units, with no broker. Not a real company.', desc_pt:'Anunciante de exemplo: uma incorporadora que vende suas próprias unidades, sem corretagem. Não é uma empresa real.' },
    'dueno-ejemplo': { id:'dueno-ejemplo', tipo:'dueno', nombre:'Dueño directo', responsable:'Propietario verificado', matricula:null, badge:'Dueño verificado', verificado:true, desde:'2026', inicial:'DD', demo:true,
      whatsapp:'5491100000001', email:'dueno@ejemplo.com', telefono:'+54 11 0000 0001', zonas:['Núñez'], desc:'Publicador de ejemplo: un propietario que muestra su propia unidad con titularidad verificada por BAIREN.',
      desc_en:'Sample lister: an owner showing their own unit, with title verified by BAIREN.', desc_pt:'Anunciante de exemplo: um proprietário que mostra sua própria unidade, com titularidade verificada pela BAIREN.' },
  };
  D.titulares = {};
  D.pub = id => D.PUBLICADORES[id] || D.PUBLICADORES['bairen'];
  /* Descripción y nombre del publicador en el idioma de la interfaz, si los tiene; si no, el castellano.
     El nombre 'Dueño directo' del ejemplo se traduce como dato fijo. */
  D.pubDesc = pub => (BP.lang !== 'es' && pub['desc_' + BP.lang]) || pub.desc || '';
  D.pubNombre = pub => pub.tipo === 'dueno' && pub.nombre === 'Dueño directo' ? BP.t('ui_dato_dueno_directo', pub.nombre) : pub.nombre;
  /* Una fila cruda de la base (joins del panel) → el publicador tal como lo muestra el portal */
  D.pubDeFila = fila => (fila && D.PUBLICADORES[SLUG_VIEJO[fila.slug] || fila.slug]) || fila || {};
  /* El portal nunca muestra la línea del corredor dentro de una descripción: quien publica se ve en la tarjeta del publicador. */
  D.sinLineaCorredor = s => (s || '').replace(/(^|\n+)[ \t]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel)\s*:[^\n]*/gi, '').trim();

  const AMEN_MAP = { 'Aire acond.':'Aire acondicionado', 'Jardín / Terraza':'Terraza o jardín' };
  const norm = a => AMEN_MAP[a] || a;

  function fromUnit(p, op, precio){
    /* Fotos en orden, con la portada primera y sin URLs repetidas: lo mismo que fotosDeUnidad en api/_portal/sync.js */
    let fotos = (p.imagenes||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).map(i=>i.url).filter(Boolean);
    if (p.portada_url && fotos.indexOf(p.portada_url)===-1) fotos.unshift(p.portada_url);
    fotos = Array.from(new Set(fotos));
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
      amoblado: op === 'mediano' || amen.indexOf('Amoblado') > -1, amenities: amen, cualidades: [],
      fotos, video: p.video_url ? { tipo: p.video_tipo, url: p.video_url } : null,
      descripcion: D.sinLineaCorredor(p.descripcion), descripcion_en: D.sinLineaCorredor(p.descripcion_en), descripcion_pt: D.sinLineaCorredor(p.descripcion_pt), plazo: p.plazo || '',
      publicadoEn: p.created_at, estado: p.estado, reservado, fechaLiberacion: p.fecha_liberacion,
      publicadorId: 'bairen', destacado: false, demo: false, codigo: 'BA-' + (p.slug||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) + (op==='venta'?'V':op==='alquiler'?'L':'M'),
      apto: op === 'mediano' ? ['Sin garantía propietaria'] : [],   /* lo único que el modelo de mediano plazo de Bairen garantiza */
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
    const pub = r.publicador || null; const pubId = pub ? (SLUG_VIEJO[pub.slug] || pub.slug || pub.id) : 'bairen';
    const T = (pub && D.titulares[pub.id]) || null;   /* titular con matrícula, de la vista publicador_publico */
    if (pub && !D.PUBLICADORES[pubId]) D.PUBLICADORES[pubId] = Object.assign({ storeId: pub.id, id: pubId, inicial: (pub.nombre||'P').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), desde: (pub.created_at||'').slice(0,4) || '2026', zonas: pub.zonas || [], desc: pub.descripcion || '', responsable: pub.responsable || pub.nombre, badge: pub.badge || (pub.tipo === 'dueno' ? 'Dueño verificado' : 'Corredor inmobiliario matriculado') }, pub, { id: pubId }, T && T.titular_nombre ? { responsable: T.titular_nombre, matricula: T.titular_matricula ? ((T.titular_colegio || 'CUCICBA') + ' ' + T.titular_matricula) : pub.matricula } : {});
    const fotos = []; for (const f of (r.fotos||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0))) { const u = window.BPStore ? await window.BPStore.resolveFoto(f.url) : f.url; if (u) fotos.push(u); }
    const amb = r.ambientes || null;
    return { id: r.id, slug: r.slug, op: r.operacion, tipoProp: r.tipo || 'Departamento', dir: r.direccion, unidad: r.unidad || '', titulo: r.titulo || (r.direccion + (r.unidad ? ' · ' + r.unidad : '')), barrio: r.barrio, zona: (window.BairenZonas && window.BairenZonas.zonaDe(r.barrio)) || r.zona || r.barrio, ciudad: r.ciudad || 'Capital Federal',
      precio: r.precio == null ? null : Number(r.precio), moneda: r.moneda || 'USD', periodo: r.operacion === 'venta' ? '' : '/mes', expensas: r.expensas == null ? null : Number(r.expensas),
      m2: r.m2_total || null, m2cub: r.m2_cubierto || null, amb, dorm: r.dormitorios || null, banos: r.banos || null, cocheras: r.cocheras || 0, antiguedad: r.antiguedad == null ? null : Number(r.antiguedad),
      amoblado: !!r.amoblado, amenities: r.amenities || [], caracteristicas: r.caracteristicas || [], cualidades: r.cualidades_verificadas || [], fotos, video: r.video_url ? { tipo: r.video_tipo || 'youtube', url: r.video_url } : null,
      descripcion: D.sinLineaCorredor(r.descripcion), descripcion_en: D.sinLineaCorredor(r.descripcion_en), descripcion_pt: D.sinLineaCorredor(r.descripcion_pt), plazo: r.plazo || '', emprendimiento: r.emprendimiento || null, etapa: r.etapa || null, entrega: r.entrega || null, propietarioEmail: r.propietario_email || null, publicadoEn: r.publicado_en || r.created_at, estado: r.estado, reservado: r.estado === 'reservado', publicadorId: pubId, destacado: !!(r.destacado_hasta && new Date(r.destacado_hasta) > new Date()), demo: false, codigo: r.codigo, apto: r.caracteristicas && r.caracteristicas.length ? r.caracteristicas.slice(0,3) : [], fromStore: true };
  };

  let cache = null;
  D.load = async function(){
    if (cache) return cache;

    /* Supabase es la fuente de las unidades publicadas. El JSON local es el respaldo
       de cuando el esquema `portal` todavía no existía: si Supabase responde con
       avisos, no se lee, porque si no cada unidad aparecería dos veces. */
    let publicados = [];
    try {
      if (window.BPStore) {
        await window.BPStore.init();
        const recs = await window.BPStore.publishedAvisos();
        /* Quién responde por cada publicador: la persona titular y su matrícula (migración 01).
           Si la vista no existe todavía, se sigue con lo que trae la fila del publicador. */
        try { if (window.BPStore.sb) { const { data: tit } = await window.BPStore.sb.schema('portal').from('publicador_publico').select('id,titular_nombre,titular_colegio,titular_matricula,titular_matricula_verificada'); (tit || []).forEach(t => { D.titulares[t.id] = t; }); } } catch (e) { /* sin migración */ }
        for (const r of recs) publicados.push(await D.fromStore(r));
      }
    } catch (e) { console.warn('store', e); }

    /* Sin Supabase, el JSON es la fuente. Con Supabase, del JSON entran sólo las
       unidades que la web cargó después del último seed (JSON_DESDE) y que el
       portal todavía no tiene: así los lofts del Palacio Alcorta se ven aunque no
       haya corrido seed-avisos-2026-09-10.sql. Al correr un seed nuevo, subir la
       fecha. Nunca se duplica una unidad que el portal ya publica. */
    const JSON_DESDE = '2026-09-03T18:22:31Z';
    const ya = new Set(publicados.map(a => a.slug + '|' + a.op));
    const soloNuevas = publicados.length > 0;
    try {
      const src = new URL('data/avisos-src.json', document.baseURI).href;
      const res = await fetch(src); const units = await res.json();
      units.forEach(p => {
        if (soloNuevas && !(p.created_at > JSON_DESDE)) return;
        if (p.precio_venta && !ya.has(p.slug + '|venta')) publicados.push(fromUnit(p, 'venta', Number(p.precio_venta)));
        if (p.precio_tradicional && !ya.has(p.slug + '|alquiler')) publicados.push(fromUnit(p, 'alquiler', Number(p.precio_tradicional)));
        if (p.precio_temporal && !ya.has(p.slug + '|mediano')) publicados.push(fromUnit(p, 'mediano', Number(p.precio_temporal)));
      });
    } catch (e) { if (!publicados.length) throw e; console.warn('avisos-src.json', e); }

    /* El nicho es el filtro: lo que cae fuera de BP.ZONAS no se publica (hoy, Centro
       y Almagro). zonaDe() vive en mapa-barrios.js y sabe que Palermo Hollywood es
       Palermo. Si esa biblioteca no está cargada no se puede saber la zona, y entonces
       no se filtra nada, para no esconder inventario por error. */
    if (window.BairenZonas) {
      publicados = publicados.filter(a => BP.ZONAS.indexOf(a.zona) > -1);
    }

    // "Seleccionadas de la semana": las 6 con más fotos y disponibles
    publicados.filter(a=>!a.reservado).sort((a,b)=>b.fotos.length-a.fotos.length).slice(0,6).forEach(a=>a.destacado=true);

    const all = publicados.concat(demoAvisos(publicados));
    cache = { avisos: all, publicadores: D.PUBLICADORES };
    return cache;
  };

  /* Todo lo visible de una tarjeta pasa por BP.t(clave, castellano): en es no cambia nada.
     Cada cifra elige singular o plural (dorm., baño, coch.): en castellano las abreviaturas no cambian,
     en inglés y portugués sí (bed/beds, vaga/vagas). m² y "amb." no cambian: amb. sólo aparece con 2 o más. */
  D.metaLine = a => [
    a.m2 ? a.m2 + ' m²' : null,
    a.amb ? (a.amb === 1 ? BP.t('card_monoamb', 'Monoamb.') : a.amb + ' ' + BP.t('card_amb', 'amb.')) : null,
    a.dorm ? a.dorm + ' ' + (a.dorm === 1 ? BP.t('card_dorm_1', 'dorm.') : BP.t('card_dorm_n', 'dorm.')) : null,
    a.banos ? a.banos + ' ' + (a.banos === 1 ? BP.t('card_bano', 'baño') : BP.t('card_banos', 'baños')) : null,
    a.cocheras ? a.cocheras + ' ' + (a.cocheras === 1 ? BP.t('card_coch_1', 'coch.') : BP.t('card_coch_n', 'coch.')) : null,
  ].filter(Boolean).join(' · ');
  D.opTag = a => a.op === 'venta' ? BP.t('card_venta', 'Venta') : a.op === 'mediano' ? BP.t('card_alq_mediano', 'Alquiler, mediano plazo') : BP.t('card_alq_largo', 'Alquiler, largo plazo');
  /* Operación como filtro (decisión de Tomás, 10/9/2026): "alquiler" abarca mediano y largo
     plazo; "largo" es sólo largo (los avisos de largo plazo llevan op 'alquiler'). */
  D.opMatch = (a, op) => !op || (op === 'alquiler' ? a.op !== 'venta' : op === 'largo' ? a.op === 'alquiler' : a.op === op);
  D.precioHTML = a => a.precio ? `${BP.fmtUSD(a.precio)}${a.periodo ? '<small>' + BP.t('ui_por_mes', a.periodo) + '</small>' : ''}` : BP.t('card_consultar_precio', 'Consultar precio');
  /* La insignia es un dato del publicador ('Dueño verificado', 'Corredor inmobiliario matriculado'…): se traduce como etiqueta fija; 'Selección BAIREN' es nombre propio y queda */
  D.badgeHTML = pub => !pub.matricula && pub.tipo !== 'dueno' ? `<span class="p-badge">${BP.ico.check} ${BP.esc(BP.etiqueta(pub.badge || 'Selección BAIREN'))}</span>`
    : pub.tipo === 'dueno'
    ? `<span class="p-badge dueno">${BP.ico.shield} ${BP.esc(BP.etiqueta(pub.badge || ''))}</span>`
    : pub.tipo === 'desarrolladora' ? `<span class="p-badge dueno">${BP.ico.building} ${BP.t('ui_dato_venta_directa', 'Venta directa')}</span>`
    : `<span class="p-badge">${BP.ico.shield} ${BP.esc(pub.matricula || '')}</span>`;
  D.waLink = (a, pub) => pub.whatsapp ? 'https://wa.me/' + pub.whatsapp + '?text=' + encodeURIComponent(BP.tf('card_wa_msg', 'Hola, vi {t} ({c}) en BAIREN y quiero más información.', { t: a.titulo, c: a.codigo })) : null;
  D.sinContacto = pub => !pub.whatsapp && !pub.email;

  D.cardH = function(a){
    const pub = D.pub(a.publicadorId);
    const href = BP.urlFicha(a);
    const foto = a.fotos[0] ? `<img src="${BP.sbImg(a.fotos[0], 900)}" alt="${BP.esc(a.titulo)}, ${BP.esc(a.barrio)}" loading="lazy">` : '';
    const tag = a.reservado ? `<span class="tag res">${BP.t('card_reservada', 'Reservada')}</span>` : a.destacado ? `<span class="tag">${BP.t('card_seleccionada', 'Seleccionada')}</span>` : a.demo ? `<span class="tag" style="background:#F4F0E6">${BP.t('card_ejemplo', 'Ejemplo')}</span>` : '';
    return `
<article class="p-card-h" data-id="${BP.esc(a.id)}">
  <a class="p-card-photo" href="${href}" aria-label="${BP.esc(BP.tf('card_ver', 'Ver {t}', { t: a.titulo }))}">${foto}${tag}<span class="ct">${BP.ico.photo} ${a.fotos.length}${a.video ? ' · ' + BP.ico.video : ''}</span></a>
  <div class="p-card-body">
    <div class="p-card-top"><div><div class="p-price">${a.reservado ? `<span class="p-cta-res">${BP.t('card_reservada', 'Reservada')}</span>` : D.precioHTML(a)}</div>${a.expensas ? `<div class="p-expensas">$ ${BP.fmtN(a.expensas)} ${BP.t('card_expensas', 'expensas')}</div>` : ''}</div></div>
    <div class="p-meta">${D.metaLine(a).split(' · ').map(x=>`<span>${x}</span>`).join('')}</div>
    <a class="p-addr" href="${href}">${BP.esc(a.titulo)}</a>
    <div class="p-barrio">${BP.esc(a.barrio)}, ${BP.esc(a.ciudad)}</div>
    <p class="p-desc">${BP.esc(a.descripcion).slice(0, 220)}</p>
    <div class="p-card-foot">
      <div class="p-publine">${BP.t('card_publica', 'Publica')} <b>${BP.esc(D.pubNombre(pub))}</b> ${D.badgeHTML(pub)}</div>
      <div class="acts">${a.reservado ? '' : `${D.waLink(a,pub) ? `<a class="p-icon-btn" href="${D.waLink(a,pub)}" target="_blank" rel="noopener" data-wa data-aviso="${BP.esc(a.id)}" data-pub="${BP.esc(pub.storeId || pub.id)}" aria-label="${BP.esc(BP.tf('card_wa_aria', 'Escribir por WhatsApp a {p}', { p: D.pubNombre(pub) }))}" title="WhatsApp">${BP.ico.wa}</a>` : ''}${D.sinContacto(pub) ? `<span class="p-sincontacto">${BP.t('card_contacto_pendiente', 'Contacto pendiente')}</span>` : `<a class="p-btn p-btn-sm p-btn-navy" href="${href}#contacto">${BP.ico.mail} ${BP.t('card_contactar', 'Contactar')}</a>`}`}</div>
    </div>
  </div>
  <button type="button" class="p-icon-btn p-fav ${BP.isFav(a.id)?'on':''}" data-fav="${BP.esc(a.id)}" aria-label="${BP.t('card_fav', 'Guardar en favoritos')}" aria-pressed="${BP.isFav(a.id)}">${BP.isFav(a.id)?BP.ico.heartFill:BP.ico.heart}</button>
</article>`;
  };

  D.cardV = function(a){
    const pub = D.pub(a.publicadorId);
    const href = BP.urlFicha(a);
    const foto = a.fotos[0] ? `<img src="${BP.sbImg(a.fotos[0], 700)}" alt="${BP.esc(a.titulo)}, ${BP.esc(a.barrio)}" loading="lazy">` : `<span class="card-img-placeholder">${BP.t('card_fotos_prod', 'Fotos en producción')}</span>`;
    return `
<a class="prop-card" data-flip="${BP.esc(a.id)}" href="${href}" aria-label="${BP.esc(BP.tf('card_ver_en', 'Ver {t} en {b}', { t: a.titulo, b: a.barrio }))}">
  <div class="card-img">${foto}<span class="card-tag tag-${a.op}">${D.opTag(a)}</span>${a.reservado?`<span class="card-status status-reservado">${BP.t('card_reservada', 'Reservada')}</span>`:''}</div>
  <div class="card-body">
    <div class="card-address">${BP.esc(a.titulo)}</div>
    <div class="card-barrio">${BP.esc(a.barrio)}</div>
    <div class="card-meta">${D.metaLine(a)}</div>
    <div class="card-divider"></div>
    <div class="card-footer"><div class="card-price"><span class="price-amount">${a.reservado ? BP.t('card_reservada', 'Reservada') : D.precioHTML(a)}</span></div><span class="card-cta">${BP.t('card_ver_ficha', 'Ver ficha')}</span></div>
    <div class="p-card-pub">${BP.t('card_publica', 'Publica')} <b>${BP.esc(D.pubNombre(pub))}</b> ${D.badgeHTML(pub)}</div>
  </div>
</a>`;
  };

  D.bindFavs = root => { (root||document).querySelectorAll('[data-fav]').forEach(b => { if (b._bound) return; b._bound = true; b.addEventListener('click', e => { e.preventDefault(); const on = BP.toggleFav(b.dataset.fav); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = on ? BP.ico.heartFill : BP.ico.heart; BP.toast(on ? BP.t('card_fav_on', 'Guardada en favoritos') : BP.t('card_fav_off', 'Quitada de favoritos')); }); }); };

  D.filter = function(avisos, f){
    return avisos.filter(a => {
      if (f.favs && !BP.isFav(a.id)) return false;
      if (!f.reservadas && a.reservado) return false;
      if (f.op && !D.opMatch(a, f.op)) return false;
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
      if (f.cual && f.cual.length && !f.cual.every(x => (a.cualidades||[]).indexOf(x) > -1)) return false;
      if (f.amoblado && !a.amoblado) return false;
      if (f.dueno && D.pub(a.publicadorId).tipo !== 'dueno') return false;
      if (f.pub && a.publicadorId !== f.pub) return false;
      if (f.emp && D.pub(a.publicadorId).tipo !== 'desarrolladora') return false;
      if (f.video && !a.video) return false;
      if (f.hace && (BP.diasDesde(a.publicadoEn) == null || BP.diasDesde(a.publicadoEn) > f.hace)) return false;
      if (f.q) { const q = f.q.toLowerCase(); const hay = [a.titulo, a.dir, a.barrio, a.zona, a.descripcion, a.amenities.join(' '), (a.cualidades||[]).join(' ')].join(' ').toLowerCase(); if (hay.indexOf(q) === -1) return false; }
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
  D.countsByZona = (avisos, op) => { const c={}; avisos.forEach(a=>{ if (op && !D.opMatch(a, op)) return; if (a.reservado) return; c[a.zona]=(c[a.zona]||0)+1; }); return c; };
  D.countsByOp = avisos => { const c={ venta:0, alquiler:0, mediano:0 }; avisos.forEach(a => { if (!a.reservado && c[a.op] != null) c[a.op]++; }); return c; };
  D.opConMasInventario = avisos => { const c = D.countsByOp(avisos); return Object.keys(c).sort((a,b) => c[b]-c[a])[0]; };
  D.opsConUnidades = (avisos, zona) => { const r = {}; avisos.forEach(a => { if (a.reservado) return; if (zona && a.zona !== zona) return; r[a.op] = (r[a.op]||0)+1; }); return r; };

  window.BPData = D;
})();
