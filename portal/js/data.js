/* BAIREN · Portal (prueba) · capa de datos.
   Lee las unidades reales publicadas (data/avisos-src.json, exportadas de Supabase el 10/9/2026)
   y las convierte al modelo de aviso del portal, con su publicador. Cuando exista el esquema
   `portal` en Supabase, esta capa se reemplaza por consultas a portal.avisos y portal.publicadores. */
(function(){
  'use strict';
  const BP = window.BP;
  const D = {};

  D.PUBLICADORES = {
    /* 23/9/2026 · Esta fila dejó de ser "el portal publicando" y pasó a ser un publicador más:
       Bairen Realty, la línea de alquiler a mediano plazo, con la categoría 'gestor'. El portal
       no publica ni opera; un gestor sí. El slug 'bairen' NO cambia: está en las direcciones web
       y en api/_portal/alertas.js. Esto tiene que decir lo mismo que la fila de la base
       (migracion-11-gestores.sql), porque si difieren, gana esta copia escrita a mano. */
    'bairen': { id:'bairen', tipo:'gestor', nombre:'BAIREN REALTY', responsable:null, matricula:null, colegio:null, badge:'Gestor de alquileres', verificado:true, desde:'2026', inicial:'BR',
      whatsapp:'5491123106629', email:'bairenrealty@gmail.com', telefono:null, zonas:['Recoleta','Palermo','Núñez','Puerto Madero','Belgrano'],
      desc:'Alquiler a mediano plazo, de 3 a 12 meses. Departamentos amoblados y equipados, con un solo precio todo incluido, sin garantía inmobiliaria ni seguro de caución.',
      desc_en:'Mid-term rentals, from 3 to 12 months. Furnished and equipped apartments, one all-inclusive price, with no property guarantor and no rental insurance.',
      desc_pt:'Aluguel de médio prazo, de 3 a 12 meses. Apartamentos mobiliados e equipados, com preço único que inclui tudo, sem fiador nem seguro-fiança.' },
    'inmobiliaria-ejemplo': { id:'inmobiliaria-ejemplo', tipo:'profesional', nombre:'Inmobiliaria Ejemplo', responsable:'Corredor de ejemplo', matricula:'CUCICBA 0000', badge:'Corredor inmobiliario matriculado', verificado:true, desde:'2026', inicial:'IE', demo:true,
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
  /* 8/10/2026 · Un id que no está en la lista caía en 'bairen': el aviso de un publicador nuevo salía
     firmado por BAIREN REALTY. Ahora devuelve un publicador vacío, sin nombre ni sello, y D.load no
     muestra avisos de publicadores desconocidos (ver más abajo). */
  D.pub = id => D.PUBLICADORES[id] || { id: '', nombre: '', tipo: '', verificado: false, inicial: '', desde: '', zonas: [], desc: '' };
  /* Descripción y nombre del publicador en el idioma de la interfaz, si los tiene; si no, el castellano.
     El nombre 'Dueño directo' del ejemplo se traduce como dato fijo. */
  D.pubDesc = pub => (BP.lang !== 'es' && pub['desc_' + BP.lang]) || pub.desc || '';
  /* 8/10/2026 (venta) · El dueño directo figura con su nombre y la inicial del apellido ("Graciela P."): la regla de
     portal.nombre_publico() (migracion-12-nombres-publicos.sql), que hasta ahora solo se aplicaba a los dueños que crea
     el equipo. Un dueño que se registra solo escribe su nombre completo; en el portal se ve así. Idempotente. */
  D.nombrePublico = n => { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return w.length > 1 ? w.slice(0, -1).concat(w[w.length - 1].charAt(0).toUpperCase() + '.').join(' ') : w.join(' '); };
  D.pubNombre = pub => pub.tipo === 'dueno' && pub.nombre === 'Dueño directo' ? BP.t('ui_dato_dueno_directo', pub.nombre) : pub.tipo === 'dueno' ? D.nombrePublico(pub.nombre) : pub.nombre;
  /* Una fila cruda de la base (joins del panel) → el publicador tal como lo muestra el portal */
  D.pubDeFila = fila => (fila && D.PUBLICADORES[fila.slug]) || fila || {};
  /* El portal nunca muestra la línea del corredor dentro de una descripción: quien publica se ve en la tarjeta del publicador. */
  D.sinLineaCorredor = s => (s || '').replace(/(^|\n+)[ \t]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel)\s*:[^\n]*/gi, '').trim();

  const AMEN_MAP = { 'Aire acond.':'Aire acondicionado', 'Jardín / Terraza':'Terraza o jardín' };
  const norm = a => AMEN_MAP[a] || a;

  /* 25/9/2026 · Una ficha anunciaba 156 fotos y tenía 60 distintas: la misma foto llegaba
     varias veces con la dirección apenas cambiada (con ?t=, con ?width=, o pedida por
     /render/image/ en vez de /object/). Comparar la URL tal cual no las veía iguales.
     La clave de una foto es su archivo: sin query, sin fragmento y siempre por /object/.
     Se queda la primera de cada archivo, en su orden; si es de Supabase Storage público,
     en su forma limpia, para que BP.sbImg la pueda pedir al tamaño que haga falta. */
  const RE_STORAGE = /\/storage\/v1\/(object|render\/image)\/public\//;
  D.claveFoto = u => String(u || '').split('#')[0].split('?')[0].replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
  D.fotosUnicas = lista => {
    const vistas = new Set(), out = [];
    (lista || []).forEach(u => { if (!u) return; const k = D.claveFoto(u); if (vistas.has(k)) return; vistas.add(k); out.push(RE_STORAGE.test(u) ? k : u); });
    return out;
  };

  /* Dormitorios cuando el aviso no los trae: ambientes menos uno, con mínimo uno (como siempre con las unidades de la
     web). 8/10/2026 (venta) · También para los avisos del portal sin el dato: antes quedaban en 0 y el filtro
     "Dormitorios, mínimo" los sacaba a todos. Un aviso que trae el dato (también 0, un monoambiente) usa el suyo. */
  D.dormDe = amb => amb == null ? null : Math.max(1, amb - 1);
  function fromUnit(p, op, precio){
    /* Fotos en orden, con la portada primera y sin fotos repetidas: lo mismo que fotosDeUnidad en api/_portal/sync.js,
       pero comparando por archivo (D.claveFoto) y no por la URL exacta */
    let fotos = (p.imagenes||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).map(i=>i.url).filter(Boolean);
    if (p.portada_url && !fotos.some(u => D.claveFoto(u) === D.claveFoto(p.portada_url))) fotos.unshift(p.portada_url);
    fotos = D.fotosUnicas(fotos);
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
      dorm: D.dormDe(amb), banos: amb == null ? null : (amb >= 4 ? 2 : 1),
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
    /* 8/10/2026 · Sin publicador (no vino en la consulta, o la base no lo deja ver) el aviso caía en 'bairen'
       y se mostraba como de BAIREN REALTY. Ahora queda sin publicador y D.load no lo muestra. La insignia
       por defecto ("Corredor inmobiliario matriculado") se pone sólo si el publicador está verificado. */
    const pub = r.publicador || null; const pubId = pub ? (pub.slug || pub.id || null) : null;
    const T = (pub && D.titulares[pub.id]) || null;   /* titular con matrícula, de la vista publicador_publico */
    if (pub && !D.PUBLICADORES[pubId]) D.PUBLICADORES[pubId] = Object.assign({ storeId: pub.id, id: pubId, inicial: (pub.nombre||'P').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), desde: (pub.created_at||'').slice(0,4) || '2026', zonas: pub.zonas || [], desc: pub.descripcion || '', responsable: pub.responsable || pub.nombre, badge: pub.badge || (!pub.verificado ? null : pub.tipo === 'dueno' ? 'Dueño verificado' : 'Corredor inmobiliario matriculado') }, pub, { id: pubId, zonas: pub.zonas || [] }, T && T.titular_nombre ? { responsable: T.titular_nombre, matricula: T.titular_matricula ? ((T.titular_colegio || 'CUCICBA') + ' ' + T.titular_matricula) : pub.matricula } : {});
    /* Sin repetidas (D.fotosUnicas): la tabla portal.fotos puede traer el mismo archivo varias veces */
    const fotos = []; for (const url of D.fotosUnicas((r.fotos||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).map(f => f.url))) { const u = window.BPStore ? await window.BPStore.resolveFoto(url) : url; if (u) fotos.push(u); }
    const amb = r.ambientes || null;
    return { id: r.id, slug: r.slug, op: r.operacion, tipoProp: r.tipo || 'Departamento', dir: r.direccion, unidad: r.unidad || '', titulo: r.titulo || (r.direccion + (r.unidad ? ' · ' + r.unidad : '')), barrio: r.barrio, zona: (window.BairenZonas && window.BairenZonas.zonaDe(r.barrio)) || r.zona || r.barrio, ciudad: r.ciudad || 'Capital Federal',
      precio: r.precio == null ? null : Number(r.precio), moneda: r.moneda || 'USD', periodo: r.operacion === 'venta' ? '' : '/mes', expensas: r.expensas == null ? null : Number(r.expensas),
      m2: r.m2_total || null, m2cub: r.m2_cubierto || null, amb, dorm: r.dormitorios != null ? Number(r.dormitorios) : D.dormDe(amb), dormDato: r.dormitorios != null, banos: r.banos || null, cocheras: r.cocheras || 0, antiguedad: r.antiguedad == null ? null : Number(r.antiguedad),
      amoblado: !!r.amoblado, amenities: r.amenities || [], caracteristicas: r.caracteristicas || [], cualidades: r.cualidades_verificadas || [], fotos, video: r.video_url ? { tipo: r.video_tipo || 'youtube', url: r.video_url } : null,
      descripcion: D.sinLineaCorredor(r.descripcion), descripcion_en: D.sinLineaCorredor(r.descripcion_en), descripcion_pt: D.sinLineaCorredor(r.descripcion_pt), plazo: r.plazo || '', emprendimiento: r.emprendimiento || null, etapa: r.etapa || null, entrega: r.entrega || null, propietarioEmail: r.propietario_email || null, publicadoEn: r.publicado_en || r.created_at, estado: r.estado, reservado: r.estado === 'reservado', publicadorId: pubId, destacado: !!(r.destacado_hasta && new Date(r.destacado_hasta) > new Date()), demo: false, codigo: r.codigo, apto: r.caracteristicas && r.caracteristicas.length ? r.caracteristicas.slice(0,3) : [], fromStore: true,
      /* 8/10/2026 · Tanda 2: cómo se muestra la calle ('exacta' | 'aproximada'; sin el dato, aproximada), el mapa
         (lat/lng, si la consulta las trae) y desde cuándo se puede entrar (a.disponible_desde, si la base ya tiene la
         columna; store.js la pide sólo cuando existe) */
      mostrarDir: r.mostrar_direccion || null, lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng), disponible_desde: r.disponible_desde || null };
  };

  /* 8/10/2026 · Cómo se piden los datos.
     · Con la base andando, el catálogo sale solo de Supabase (BPStore.publishedAvisos: las columnas de la lista, por
       tramos hasta tenerlo entero). data/avisos-src.json ya no se baja: queda como respaldo si la base no responde.
       Antes se bajaba siempre (183 KB en cada página) para sumar unidades de la web que el portal todavía no tenía;
       eso hoy lo hace la sincronización del cron cada 15 minutos.
     · Lo que llegó de la base se guarda en sessionStorage por CACHE_MS: en la misma visita, pasar de la portada a
       la búsqueda o volver de una ficha no vuelve a pedir el catálogo. Si no entra (cuota) o el navegador no deja,
       sigue sin caché. BPData.olvidarCatalogo() la borra (por ejemplo, después de publicar).
     · La ficha no usa esto: D.loadFicha pide un solo aviso y sus similares. */
  let cache = null;
  const CACHE_CLAVE = 'bp_catalogo_v1', CACHE_MS = 5 * 60 * 1000;
  const cacheLeer = () => { try { const c = JSON.parse(sessionStorage.getItem(CACHE_CLAVE)); if (c && Array.isArray(c.recs) && Date.now() - c.t >= 0 && Date.now() - c.t < CACHE_MS) return c; } catch (e) { /* sin sessionStorage */ } return null; };
  const cacheGuardar = c => { try { sessionStorage.setItem(CACHE_CLAVE, JSON.stringify(Object.assign({ t: Date.now() }, c))); } catch (e) { try { sessionStorage.removeItem(CACHE_CLAVE); } catch (_) { /* nada */ } } };
  D.olvidarCatalogo = () => { cache = null; try { sessionStorage.removeItem(CACHE_CLAVE); } catch (e) { /* nada */ } };
  /* Los avisos de la base y sus titulares: de la caché de la visita o de Supabase. Lanza si la base falla. */
  async function catalogoDeLaBase(){
    const c = cacheLeer(); if (c) return c;
    const recs = await window.BPStore.publishedAvisos();
    /* Quién responde por cada publicador: la persona titular y su matrícula (migración 01). Solo los publicadores
       del catálogo. Si la vista no existe todavía, se sigue con lo que trae la fila del publicador. */
    let tit = []; try { tit = await window.BPStore.titularesDe(recs.map(r => r.publicador_id)); } catch (e) { /* sin migración */ }
    const nuevo = { recs, tit }; cacheGuardar(nuevo); return nuevo;
  }
  D.load = async function(){
    if (cache) return cache;

    let publicados = [], conBase = false;
    try {
      if (window.BPStore) {
        await window.BPStore.init();
        if (window.BPStore.mode === 'supabase') {
          const { recs, tit } = await catalogoDeLaBase();
          (tit || []).forEach(t => { D.titulares[t.id] = t; });
          for (const r of recs) publicados.push(await D.fromStore(r));
          conBase = true;
        } else {
          for (const r of await window.BPStore.publishedAvisos()) publicados.push(await D.fromStore(r));   /* modo local: lo cargado en este navegador */
        }
      }
    } catch (e) { console.warn('store', e); }

    /* Sin base (modo local, o Supabase no respondió), el JSON es la fuente. En modo local con avisos cargados en este
       navegador, del JSON entran solo las unidades posteriores al último seed (JSON_DESDE), como siempre. Nunca se
       duplica una unidad que ya está. Con la base andando no se pide. */
    if (!conBase) {
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
    }

    /* El nicho es el filtro: lo que cae fuera de BP.ZONAS no se publica (hoy, Centro
       y Almagro). zonaDe() vive en mapa-barrios.js y sabe que Palermo Hollywood es
       Palermo. Si esa biblioteca no está cargada no se puede saber la zona, y entonces
       no se filtra nada, para no esconder inventario por error. */
    if (window.BairenZonas) {
      publicados = publicados.filter(a => BP.ZONAS.indexOf(a.zona) > -1);
    }
    /* 8/10/2026 · Si no se puede saber quién publica, el aviso no se muestra: nunca se firma con otro nombre */
    publicados = publicados.filter(a => a.publicadorId && D.PUBLICADORES[a.publicadorId]);

    // "Seleccionadas de la semana": las 6 con más fotos y disponibles
    publicados.filter(a=>!a.reservado).sort((a,b)=>b.fotos.length-a.fotos.length).slice(0,6).forEach(a=>a.destacado=true);

    /* Los avisos y publicadores de ejemplo existen para probar sin base (modo local).
       Con la base real no se muestran: un mail a ejemplo@ejemplo.com no le sirve a nadie. */
    const conEjemplos = !(window.BPStore && window.BPStore.mode === 'supabase');
    const all = conEjemplos ? publicados.concat(demoAvisos(publicados)) : publicados;
    const pubs = conEjemplos ? D.PUBLICADORES : Object.fromEntries(Object.entries(D.PUBLICADORES).filter(([, p]) => !p.demo));
    cache = { avisos: all, publicadores: pubs };
    return cache;
  };

  /* 8/10/2026 · La ficha pide lo suyo y nada más: el aviso (con fotos y publicador) en un pedido; después, en
     paralelo, hasta 6 similares (misma operación y zona, con la portada sola) y el titular de su publicador.
     Antes bajaba el catálogo entero, con las descripciones en tres idiomas de todos los avisos, para mostrar uno.
     Devuelve { aviso, similares } con el modelo del portal; aviso null si no está publicado o cae fuera de las zonas.
     Sin base (modo local) o si la base falla, cae al catálogo de siempre (D.load) y busca ahí. */
  D.loadFicha = async function(ref){
    ref = String(ref || '');
    const S = window.BPStore;
    const enZona = a => !window.BairenZonas || BP.ZONAS.indexOf(a.zona) > -1;   /* mismo nicho que D.load */
    try {
      if (S) {
        await S.init();
        if (S.mode === 'supabase') {
          const r = await S.avisoPublicado(ref);
          if (!r) return { aviso: null, similares: [] };
          const [sims, tit] = await Promise.all([S.similaresDe(r, 6), S.titularesDe([r.publicador_id]).catch(() => [])]);
          tit.forEach(t => { D.titulares[t.id] = t; });
          const aviso = await D.fromStore(r);
          if (!enZona(aviso)) return { aviso: null, similares: [] };
          const similares = []; for (const s of sims) { const x = await D.fromStore(s); if (enZona(x)) similares.push(x); }
          return { aviso, similares };
        }
      }
    } catch (e) { console.warn('ficha: la base no respondió, se busca en el respaldo', e); }
    const { avisos } = await D.load();
    const aviso = avisos.find(x => x.id === ref) || avisos.find(x => x.slug === ref) || null;
    return { aviso, similares: aviso ? avisos.filter(x => x.id !== aviso.id && x.op === aviso.op && (x.zona === aviso.zona || x.barrio === aviso.barrio)) : [] };
  };

  /* Todo lo visible de una tarjeta pasa por BP.t(clave, castellano): en es no cambia nada.
     Cada cifra elige singular o plural (dorm., baño, coch.): en castellano las abreviaturas no cambian,
     en inglés y portugués sí (bed/beds, vaga/vagas). m² y "amb." no cambian: amb. sólo aparece con 2 o más. */
  D.metaLine = a => [
    a.m2 ? a.m2 + ' m²' : null,
    a.amb ? (a.amb === 1 ? BP.t('card_monoamb', 'Monoamb.') : a.amb + ' ' + BP.t('card_amb', 'amb.')) : null,
    /* 23/9/2026 · En un monoambiente no se nombra el dormitorio. Nueve avisos decían
       "Monoamb. · 1 dorm.", que es una contradicción: el dato de dormitorios viene inferido
       de los ambientes, no cargado. Cuando hay un solo ambiente, el dormitorio no se muestra. */
    (a.dorm && a.amb !== 1) ? a.dorm + ' ' + (a.dorm === 1 ? BP.t('card_dorm_1', 'dorm.') : BP.t('card_dorm_n', 'dorm.')) : null,
    a.banos ? a.banos + ' ' + (a.banos === 1 ? BP.t('card_bano', 'baño') : BP.t('card_banos', 'baños')) : null,
    a.cocheras ? a.cocheras + ' ' + (a.cocheras === 1 ? BP.t('card_coch_1', 'coch.') : BP.t('card_coch_n', 'coch.')) : null,
  ].filter(Boolean).join(' · ');
  /* 8/10/2026 · Etiquetas de operación, cortas (contrato de la tanda 2): "Venta", "Tradicional" y "Mediano plazo".
     En la base no cambia nada: 'venta' | 'alquiler' | 'mediano'. La tarjeta dice "Reservada" en su lugar si lo está. */
  D.opTag = a => a.op === 'venta' ? BP.t('card_venta', 'Venta') : a.op === 'mediano' ? BP.t('card_alq_mediano', 'Mediano plazo') : BP.t('card_alq_largo', 'Tradicional');
  /* La calle: con mostrar_direccion 'exacta', tal cual ("Peña 2528"); si no (aproximada o sin el dato), sin la altura
     ("Peña"). Sólo se saca un número al final ("Av. 9 de Julio" queda entera). Nunca la unidad. */
  D.calle = a => { const d = String((a && a.dir) || '').trim(); if (!d || a.mostrarDir === 'exacta') return d; return d.replace(/\s+(?:al\s+)?\d+(?:\s*bis)?\s*$/i, '').trim() || d; };
  /* La altura redondeada a la cuadra, para el mapa de una dirección aproximada ("Peña 2500") */
  D.cuadra = a => { const d = String((a && a.dir) || '').trim(); const m = d.match(/^(.*?\S)\s+(?:al\s+)?(\d+)(?:\s*bis)?\s*$/i); return m ? m[1] + ' ' + Math.floor(Number(m[2]) / 100) * 100 : d; };
  /* Título humano: "Monoambiente en Recoleta", "2 ambientes en Palermo Soho"; sin ambientes, el tipo ("Casa en San Isidro") */
  D.titulo = a => {
    const b = a.barrio || BP.zonaLabel(a.zona || '') || '';
    const que = a.amb === 1 ? BP.t('tit_mono', 'Monoambiente') : a.amb > 1 ? BP.tf('tit_amb', '{n} ambientes', { n: a.amb }) : BP.etiqueta(a.tipoProp || 'Departamento');
    return b ? BP.tf('tit_en', '{q} en {b}', { q: que, b }) : que;
  };
  /* Lo que se nombra del aviso fuera de la ficha (alt de la foto, WhatsApp, compartir): el título humano y la calle */
  D.nombre = a => [D.titulo(a), D.calle(a)].filter(Boolean).join(', ');
  /* Datos de la tarjeta en una línea: superficie, baños y cocheras (los ambientes ya están en el título) */
  D.metaCorta = a => [
    a.m2 ? a.m2 + ' m²' : null,
    a.banos ? a.banos + ' ' + (a.banos === 1 ? BP.t('card_bano', 'baño') : BP.t('card_banos', 'baños')) : null,
    a.cocheras ? a.cocheras + ' ' + (a.cocheras === 1 ? BP.t('card_coch_1', 'coch.') : BP.t('card_coch_n', 'coch.')) : null,
  ].filter(Boolean).join(' · ');
  /* 8/10/2026 (venta) · Una unidad de un emprendimiento: el nombre del desarrollo y el piso y unidad ("Torre Ejemplo · 2° A"),
     y la etapa con la entrega ("En construcción · entrega diciembre 2027"). La entrega es un dato escrito por la
     desarrolladora: se traduce solo el nombre del mes. */
  const MESES_LARGOS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  D.mesTr = s => { const tr = BP.t('emp_meses', MESES_LARGOS.join('|')).split('|'); return String(s || '').replace(/[A-Za-zÁÉÍÓÚÑáéíóúñ]+/g, w => { const i = MESES_LARGOS.indexOf(w.toLowerCase()); if (i < 0 || !tr[i]) return w; const t = tr[i]; return w[0] === w[0].toUpperCase() ? t[0].toUpperCase() + t.slice(1) : t; }); };
  D.etapaTxt = a => { if (!a || (!a.etapa && !a.entrega)) return ''; const et = { pozo: BP.t('emp_pozo', 'En pozo'), construccion: BP.t('emp_construccion', 'En construcción'), terminado: BP.t('emp_terminado', 'Terminado') }[a.etapa] || ''; return [et, a.entrega ? BP.tf('emp_entrega_min', 'entrega {d}', { d: D.mesTr(String(a.entrega).replace(/^[A-ZÁÉÍÓÚ][a-záéíóú]+/, w => MESES_LARGOS.indexOf(w.toLowerCase()) > -1 ? w.toLowerCase() : w)) }) : ''].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase()); };
  D.empUnidad = a => a && a.emprendimiento ? [a.emprendimiento, a.unidad].filter(Boolean).join(' · ') : '';
  /* La página de un desarrollo: Desarrollos filtrado por ese nombre y ese publicador */
  D.urlEmp = a => 'emprendimientos.html?emp=' + encodeURIComponent(a.emprendimiento || a.nombre || '') + (a.publicadorId ? '&pub=' + encodeURIComponent(a.publicadorId) : '');
  /* Precio corto: "USD 1.200 /mes", "$ 850.000 /mes", "USD 295.000" */
  D.precioCorto = a => a.precio ? `${BP.fmtPrecio(a.precio, a.moneda)}${a.periodo ? ' <small>' + BP.t('ui_por_mes', '/mes') + '</small>' : ''}` : BP.t('card_consultar_precio', 'Consultar precio');
  /* "Disponible desde 14 nov": sólo si el aviso trae disponible_desde y es una fecha futura. La fecha es un día (date),
     se lee como día local y no como medianoche UTC (que en Buenos Aires es el día anterior). */
  const MESES = { es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], pt: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'] };
  D.disponibleDesde = a => {
    const m = String((a && a.disponible_desde) || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
    const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (!(f > hoy)) return '';
    const mes = (MESES[BP.lang] || MESES.es)[f.getMonth()];
    const fecha = (BP.lang === 'en' ? mes + ' ' + f.getDate() : f.getDate() + ' ' + mes) + (f.getFullYear() !== hoy.getFullYear() ? ' ' + f.getFullYear() : '');
    return BP.tf('disp_desde', 'Disponible desde {f}', { f: fecha });
  };
  /* Quién publica, en una línea de texto: "BAIREN Realty · Gestor de alquileres". El ✓ chico, sólo si está verificado.
     Un nombre todo en mayúsculas se muestra con mayúscula inicial (BAIREN y las siglas de hasta tres letras quedan). */
  D.nombreVisible = n => { n = String(n || ''); return /[a-záéíóúñ]/.test(n) || n.trim().split(/\s+/).length < 2 ? n : n.trim().split(/\s+/).map(w => w === 'BAIREN' || w.length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(' '); };
  D.pubRol = pub => !pub ? '' : pub.tipo === 'dueno' ? (pub.verificado ? BP.etiqueta(pub.badge || 'Dueño verificado') : BP.t('ui_dato_dueno_directo', 'Dueño directo'))
    : !pub.verificado ? '' : BP.etiqueta(pub.badge || ({ gestor: 'Gestor de alquileres', desarrolladora: 'Desarrolladora', profesional: 'Inmobiliaria' })[pub.tipo] || '');
  D.pubLinea = pub => {
    if (!pub || !pub.nombre) return '';
    const nombre = D.nombreVisible(D.pubNombre(pub)), rol = D.pubRol(pub);
    const check = pub.verificado ? `<span class="p-verif" role="img" aria-label="${BP.esc(BP.t('pub_verificado', 'verificado'))}">${BP.ico.check}</span>` : '';
    /* El separador va pegado a lo anterior (espacio duro): si el renglón se corta, el "·" no queda suelto al principio */
    return `<b>${BP.esc(nombre)}</b>${check}${rol && rol !== nombre ? '&nbsp;· ' + BP.esc(rol) : ''}`;
  };
  /* La operación del aviso como filtro del catálogo: el alquiler tradicional es 'largo' ('alquiler' abarca los dos plazos) */
  D.opFiltro = a => a.op === 'alquiler' ? 'largo' : a.op;
  /* Operación como filtro (decisión de Tomás, 10/9/2026): "alquiler" abarca mediano y largo
     plazo; "largo" es sólo largo (los avisos de largo plazo llevan op 'alquiler'). */
  D.opMatch = (a, op) => !op || (op === 'alquiler' ? a.op !== 'venta' : op === 'largo' ? a.op === 'alquiler' : a.op === op);
  /* 8/10/2026 · Con su moneda y "por mes" en palabras: "USD 1.100 por mes", "$ 850.000 por mes" */
  D.precioHTML = a => a.precio ? `${BP.fmtPrecio(a.precio, a.moneda)}${a.periodo ? ' <small>' + BP.t('card_por_mes', 'por mes') + '</small>' : ''}` : BP.t('card_consultar_precio', 'Consultar precio');
  /* La insignia es un dato del publicador ('Dueño verificado', 'Corredor inmobiliario matriculado'…): se traduce como etiqueta fija; 'Selección BAIREN' es nombre propio y queda */
  /* 22/9/2026 · El sello del dueño se pinta SOLO si la titularidad está verificada de verdad.
     Antes se pintaba "Dueño verificado" con escudo por el mero hecho de ser tipo 'dueno', sin
     mirar el flag: el sello, que es la promesa del portal, no lo respaldaba nada. Sin verificar
     se dice "Dueño directo", sin escudo, que es cierto y no promete lo que no se controló. */
  /* 8/10/2026 · Publicador sin verificar: su nombre, sin sello. El dueño sin verificar sigue diciendo "Dueño directo". */
  D.badgeHTML = pub => !pub || !pub.verificado ? (pub && pub.tipo === 'dueno' ? `<span class="p-badge dueno">${BP.esc(BP.t('ui_dato_dueno_directo', 'Dueño directo'))}</span>` : '')
    : !pub.matricula && pub.tipo !== 'dueno' ? `<span class="p-badge">${BP.ico.check} ${BP.esc(BP.etiqueta(pub.badge || ({ gestor: 'Gestor de alquileres', desarrolladora: 'Desarrolladora', profesional: 'Inmobiliaria' })[pub.tipo] || 'Verificado'))}</span>`
    : pub.tipo === 'dueno'
    ? (pub.verificado
        ? `<span class="p-badge dueno">${BP.ico.shield} ${BP.esc(BP.etiqueta(pub.badge || 'Dueño verificado'))}</span>`
        : `<span class="p-badge dueno">${BP.esc(BP.t('ui_dato_dueno_directo', 'Dueño directo'))}</span>`)
    : pub.tipo === 'desarrolladora' ? `<span class="p-badge dueno">${BP.ico.building} ${BP.t('ui_dato_venta_directa', 'Venta directa')}</span>`
    : `<span class="p-badge">${BP.ico.shield} ${BP.esc(pub.matricula || '')}</span>`;
  D.waLink = (a, pub) => pub.whatsapp ? 'https://wa.me/' + pub.whatsapp + '?text=' + encodeURIComponent(BP.tf('card_wa_msg', 'Hola, vi {t} ({c}) en BAIREN y quiero más información.', { t: D.nombre(a), c: a.codigo })) : null;
  D.sinContacto = pub => !pub.whatsapp && !pub.email;

  D.cardH = function(a){
    const pub = D.pub(a.publicadorId);
    const href = BP.urlFicha(a);
    /* 25/9/2026 · Con el barrio vacío la tarjeta decía ", Capital Federal" y el texto alternativo terminaba en coma.
       Misma regla que la ficha: el barrio; si falta, la zona; si falta también, se omite el tramo. */
    const lugar = a.barrio || BP.zonaLabel(a.zona) || '';
    const foto = a.fotos[0] ? `<img src="${BP.sbImg(a.fotos[0], 900)}" alt="${BP.esc([a.titulo, lugar].filter(Boolean).join(', '))}" loading="lazy">` : '';
    const tag = a.reservado ? `<span class="tag res">${BP.t('card_reservada', 'Reservada')}</span>` : a.destacado ? `<span class="tag">${BP.t('card_seleccionada', 'Seleccionada')}</span>` : a.demo ? `<span class="tag" style="background:#F4F0E6">${BP.t('card_ejemplo', 'Ejemplo')}</span>` : '';
    return `
<article class="p-card-h" data-id="${BP.esc(a.id)}">
  <a class="p-card-photo" href="${href}" aria-label="${BP.esc(BP.tf('card_ver', 'Ver {t}', { t: a.titulo }))}">${foto}${tag}<span class="ct">${BP.ico.photo} ${a.fotos.length}${a.video ? ' · ' + BP.ico.video : ''}</span></a>
  <div class="p-card-body">
    <div class="p-card-top"><div><div class="p-price">${a.reservado ? `<span class="p-cta-res">${BP.t('card_reservada', 'Reservada')}</span>` : D.precioHTML(a)}</div>${a.expensas ? `<div class="p-expensas">$ ${BP.fmtN(a.expensas)} ${BP.t('card_expensas', 'expensas')}</div>` : ''}</div></div>
    <div class="p-meta">${D.metaLine(a).split(' · ').map(x=>`<span>${x}</span>`).join('')}</div>
    <a class="p-addr" href="${href}">${BP.esc(a.titulo)}</a>
    <div class="p-barrio">${[lugar, a.ciudad].filter(Boolean).map(BP.esc).join(', ')}</div>
    <p class="p-desc">${BP.esc(a.descripcion).slice(0, 220)}</p>
    <div class="p-card-foot">
      ${pub.nombre ? `<div class="p-publine">${BP.t('card_publica', 'Publica')} <b>${BP.esc(D.pubNombre(pub))}</b> ${D.badgeHTML(pub)}</div>` : '<div></div>'}
      <div class="acts">${a.reservado ? '' : `${D.waLink(a,pub) ? `<a class="p-icon-btn" href="${D.waLink(a,pub)}" target="_blank" rel="noopener" data-wa data-aviso="${BP.esc(a.id)}" data-pub="${BP.esc(pub.storeId || pub.id)}" aria-label="${BP.esc(BP.tf('card_wa_aria', 'Escribir por WhatsApp a {p}', { p: D.pubNombre(pub) }))}" title="WhatsApp">${BP.ico.wa}</a>` : ''}${D.sinContacto(pub) ? `<span class="p-sincontacto">${BP.t('card_contacto_pendiente', 'Contacto pendiente')}</span>` : `<a class="p-btn p-btn-sm p-btn-navy" href="${href}#contacto">${BP.ico.mail} ${BP.t('card_contactar', 'Contactar')}</a>`}`}</div>
    </div>
  </div>
  <button type="button" class="p-icon-btn p-fav ${BP.isFav(a.id)?'on':''}" data-fav="${BP.esc(a.id)}" aria-label="${BP.t('card_fav', 'Guardar en favoritos')}" aria-pressed="${BP.isFav(a.id)}">${BP.isFav(a.id)?BP.ico.heartFill:BP.ico.heart}</button>
</article>`;
  };

  /* 8/10/2026 · Tanda 2 · La tarjeta, más corta (como pidió Tomás: "demasiados textos y muchas cosas").
     Sobre la foto, la operación corta (o "Reservada") y, si viene, "Disponible desde 14 nov". Abajo: la calle chica
     en versalitas (sin altura si la dirección es aproximada), el título humano, el precio con su moneda y /mes,
     los datos en una línea y quién publica en una línea de texto. Sin botón "Ver ficha": toda la tarjeta es un
     solo enlace. El corazón queda afuera del enlace (un botón no puede ir adentro de un <a>), encima de la foto.
     La clase prop-card queda en la raíz: la usan el catálogo (foco al cambiar de página) y otras grillas. */
  D.cardV = function(a){
    const pub = D.pub(a.publicadorId);
    const href = BP.urlFicha(a);
    /* Una unidad de un emprendimiento lleva arriba el desarrollo y el piso y unidad en vez de la calle, y sobre la foto la
       etapa y la entrega en vez de "Disponible desde" */
    const emp = D.empUnidad(a);
    const tit = D.titulo(a), calle = emp || D.calle(a), desde = emp ? D.etapaTxt(a) : D.disponibleDesde(a), fav = BP.isFav(a.id);
    const foto = a.fotos[0] ? `<img src="${BP.sbImg(a.fotos[0], 700)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : `<span class="tj-sinfoto">${BP.t('card_fotos_prod', 'Fotos en producción')}</span>`;
    const tag = a.reservado ? `<span class="tj-tag res">${BP.t('card_reservada', 'Reservada')}</span>` : `<span class="tj-tag tj-${a.op}">${D.opTag(a)}</span>`;
    const meta = D.metaCorta(a), linea = D.pubLinea(pub);
    return `
<article class="prop-card p-tj" data-flip="${BP.esc(a.id)}">
  <a class="tj-link" href="${href}">
    <span class="tj-foto">${foto}${tag}${desde ? `<span class="tj-desde">${BP.esc(desde)}</span>` : ''}</span>
    <span class="tj-cuerpo">
      ${calle ? `<span class="tj-calle">${BP.esc(calle)}</span>` : ''}
      <span class="tj-titulo">${BP.esc(tit)}</span>
      <span class="tj-fila"><span class="tj-precio">${D.precioCorto(a)}</span>${meta ? `<span class="tj-meta">${meta}</span>` : ''}</span>
      ${linea ? `<span class="tj-pub">${linea}</span>` : ''}
    </span>
  </a>
  <button type="button" class="tj-fav${fav ? ' on' : ''}" data-fav="${BP.esc(a.id)}" aria-label="${BP.esc(BP.tf('card_fav_de', 'Guardar {t}', { t: tit }))}" aria-pressed="${fav}">${fav ? BP.ico.heartFill : BP.ico.heart}</button>
</article>`;
  };

  /* 8/10/2026 (venta) · La tarjeta de un desarrollo, con la misma forma que cardV: la foto con la etapa y la entrega, la
     calle, el nombre, "Desde" el precio más bajo y las unidades con el rango de ambientes. La usa Revisar de un
     emprendimiento (antes mostraba la tarjeta de la primera unidad). e es un grupo de D.emprendimientos. */
  D.cardEmp = function(e){
    const pub = D.pub(e.publicadorId), linea = D.pubLinea(pub), calle = D.calle({ dir: e.dir, mostrarDir: e.mostrarDir }), etapa = D.etapaTxt(e);
    const foto = e.foto ? `<img src="${BP.sbImg(e.foto, 700)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : `<span class="tj-sinfoto">${BP.t('card_fotos_prod', 'Fotos en producción')}</span>`;
    const n = e.unidades.length, amb = e.ambmin ? (e.ambmin === e.ambmax ? BP.tf('emp_amb', '{n} amb.', { n: e.ambmin }) : BP.tf('emp_amb_rango', '{a} a {b} amb.', { a: e.ambmin, b: e.ambmax })) : '';
    const meta = [n === 1 ? BP.t('emp_unidad_1', '1 unidad') : BP.tf('emp_unidades', '{n} unidades', { n }), amb].filter(Boolean).join(' · ');
    return `
<article class="prop-card p-tj p-tj-emp">
  <div class="tj-link">
    <span class="tj-foto">${foto}<span class="tj-tag tj-venta">${BP.t('card_venta', 'Venta')}</span>${etapa ? `<span class="tj-desde">${BP.esc(etapa)}</span>` : ''}</span>
    <span class="tj-cuerpo">
      ${calle ? `<span class="tj-calle">${BP.esc(calle)}</span>` : ''}
      <span class="tj-titulo">${BP.esc(e.nombre)}</span>
      <span class="tj-fila"><span class="tj-precio">${e.desde ? BP.tf('emp_desde', 'Desde {p}', { p: BP.fmtUSD(e.desde) }) : BP.t('card_consultar_precio', 'Consultar precio')}</span><span class="tj-meta">${BP.esc(meta)}</span></span>
      ${linea ? `<span class="tj-pub">${linea}</span>` : ''}
    </span>
  </div>
</article>`;
  };

  /* El corazón, en cualquier tarjeta o ficha de cualquier página (también las grillas que no llamaban a bindFavs,
     como el panel): un solo escucha en el documento. bindFavs queda para no romper a quien lo llama. */
  let favsEnganchados = false;
  D.bindFavs = () => {
    if (favsEnganchados) return; favsEnganchados = true;
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-fav]'); if (!b) return;
      e.preventDefault();
      const on = BP.toggleFav(b.dataset.fav);
      document.querySelectorAll('[data-fav]').forEach(x => { if (x.dataset.fav !== b.dataset.fav) return; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); x.innerHTML = on ? BP.ico.heartFill : BP.ico.heart; });
      BP.toast(on ? BP.t('card_fav_on', 'Guardada en favoritos') : BP.t('card_fav_off', 'Quitada de favoritos'));
      try { document.dispatchEvent(new CustomEvent('bp:fav', { detail: { id: b.dataset.fav, on } })); } catch (err) { /* nada */ }
    });
  };
  D.bindFavs();

  /* 8/10/2026 · Regla de "todo incluido" (contrato del lanzamiento). Antes era todo el mediano plazo; ahora
     publican también otras empresas. Se dice "todo incluido" en un aviso de mediano plazo de BAIREN REALTY
     (publicador 'bairen') o cuando el aviso tiene a la vez 'Expensas incluidas' y 'Servicios incluidos'.
     Si no, el precio va por mes y la ficha muestra lo que incluye (los textos de D.INCLUYE, si hay). */
  D.INCLUYE = ['Expensas incluidas', 'Servicios incluidos', 'Internet incluido', 'Limpieza incluida', 'Ropa blanca incluida'];
  D.incluye = a => (a.caracteristicas || []).filter(x => D.INCLUYE.indexOf(x) > -1);
  D.todoIncluido = a => a.op === 'mediano' && (a.publicadorId === 'bairen' || (D.incluye(a).indexOf('Expensas incluidas') > -1 && D.incluye(a).indexOf('Servicios incluidos') > -1));
  D.expensasIncluidas = a => D.todoIncluido(a) || D.incluye(a).indexOf('Expensas incluidas') > -1;
  /* Condiciones de la ficha (tanda 2): sin garantía propietaria (el mediano plazo de BAIREN REALTY, o el aviso que lo
     dice) y mascotas (la característica 'Permite mascotas', la amenity 'Pet friendly' o la cualidad verificada) */
  D.sinGarantia = a => (a.apto || []).concat(a.caracteristicas || []).indexOf('Sin garantía propietaria') > -1 || (a.op === 'mediano' && a.publicadorId === 'bairen');
  D.aceptaMascotas = a => (a.caracteristicas || []).indexOf('Permite mascotas') > -1 || (a.amenities || []).indexOf('Pet friendly') > -1 || (a.cualidades || []).indexOf('Acepta mascotas') > -1;
  /* En mediano plazo, `plazo` es la estadía mínima ("3 meses"). Los avisos que vienen de la web traen el rango
     entero ("3-12 meses"): eso no es un mínimo, y se sigue mostrando como "Plazo". */
  D.estadiaMinima = a => a.op === 'mediano' && !!a.plazo && !/\d\s*(?:-|–|a|to)\s*\d/i.test(a.plazo);
  D.filter = function(avisos, f){
    return avisos.filter(a => {
      if (f.favs && !BP.isFav(a.id)) return false;
      if (!f.reservadas && a.reservado) return false;
      if (f.op && !D.opMatch(a, f.op)) return false;
      if (f.tipo && f.tipo !== 'todos' && a.tipoProp.toLowerCase() !== f.tipo) return false;
      if (f.zonas && f.zonas.length && f.zonas.indexOf(a.zona) === -1) return false;
      /* 8/10/2026 · El rango de precio es en una moneda (f.mon: '' es USD, 'ARS' pesos): los avisos en la otra no entran.
         Sin rango de precio se ven todos. */
      if ((f.pmin || f.pmax) && (a.moneda === 'ARS' ? 'ARS' : 'USD') !== (f.mon === 'ARS' ? 'ARS' : 'USD')) return false;
      if (f.pmin && (a.precio||0) < f.pmin) return false;
      if (f.pmax && (a.precio||0) > f.pmax) return false;
      /* 23/9/2026 · Antes decía `a.expensas &&`, o sea que los avisos SIN expensas cargadas
         pasaban el filtro. Con 38 de 42 sin el dato, poner "expensas máximas $1" devolvía 22
         de 25 resultados: el filtro prometía algo que no hacía. Ahora, si alguien filtra por
         expensas, el que no tiene el dato queda afuera, que es lo que esa persona espera. */
      /* 25/9/2026 · El precio del mediano plazo es todo incluido (la ficha lo dice: "por mes · todo
         incluido"; en los datos no hay otra marca, es la operación 'mediano'): ahí las expensas cuentan
         como 0 y el aviso pasa cualquier máximo. Si no es todo incluido y no hay dato, no pasa. */
      if (f.expmax && !(D.expensasIncluidas(a) || (a.expensas > 0 && a.expensas <= f.expmax))) return false;
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
    /* 8/10/2026 · Por precio no se mezclan monedas: primero los avisos en dólares, después los en pesos, y cada grupo
       en su orden (300 pesos no es menos que 1.000 dólares). Sin precio, al final de su grupo. */
    const grupo = a => a.moneda === 'ARS' ? 1 : 0;
    if (key === 'precio_asc') l.sort((a,b)=>(grupo(a)-grupo(b))||((a.precio||9e15)-(b.precio||9e15)));
    else if (key === 'precio_desc') l.sort((a,b)=>(grupo(a)-grupo(b))||((b.precio||0)-(a.precio||0)));
    else if (key === 'recientes') l.sort((a,b)=>t(b)-t(a));
    else if (key === 'm2') l.sort((a,b)=>(b.m2||0)-(a.m2||0));
    else l.sort((a,b)=>(b.destacado-a.destacado)||(a.reservado-b.reservado)||(t(b)-t(a)));
    return l;
  };
  D.emprendimientos = avisos => { const g = {}; avisos.forEach(a => { if (!a.emprendimiento) return; const k = a.publicadorId + '|' + a.emprendimiento; (g[k] = g[k] || { key: k, nombre: a.emprendimiento, publicadorId: a.publicadorId, zona: a.zona, barrio: a.barrio, dir: a.dir, mostrarDir: a.mostrarDir, etapa: a.etapa, entrega: a.entrega, unidades: [] }).unidades.push(a); }); return Object.values(g).map(e => { const p = e.unidades.map(u => u.precio).filter(Boolean), m = e.unidades.map(u => u.m2).filter(Boolean), am = e.unidades.map(u => u.amb).filter(Boolean); e.desde = p.length ? Math.min.apply(null, p) : null; e.m2min = m.length ? Math.min.apply(null, m) : null; e.m2max = m.length ? Math.max.apply(null, m) : null; e.ambmin = am.length ? Math.min.apply(null, am) : null; e.ambmax = am.length ? Math.max.apply(null, am) : null; e.foto = (e.unidades.find(u => u.fotos.length) || {}).fotos; e.foto = e.foto ? e.foto[0] : null; return e; }); };
  D.countsByZona = (avisos, op) => { const c={}; avisos.forEach(a=>{ if (op && !D.opMatch(a, op)) return; if (a.reservado) return; c[a.zona]=(c[a.zona]||0)+1; }); return c; };
  D.countsByOp = avisos => { const c={ venta:0, alquiler:0, mediano:0 }; avisos.forEach(a => { if (!a.reservado && c[a.op] != null) c[a.op]++; }); return c; };
  D.opConMasInventario = avisos => { const c = D.countsByOp(avisos); return Object.keys(c).sort((a,b) => c[b]-c[a])[0]; };
  D.opsConUnidades = (avisos, zona) => { const r = {}; avisos.forEach(a => { if (a.reservado) return; if (zona && a.zona !== zona) return; r[a.op] = (r[a.op]||0)+1; }); return r; };

  window.BPData = D;
})();
