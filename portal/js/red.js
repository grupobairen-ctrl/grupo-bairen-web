/* ── La red BAIREN: el miembro y su búsqueda (Fase 1, 3/10/2026) ─────────────
   Lo que el que busca arma una sola vez y la red usa en todos lados:
   · La búsqueda: qué quiere, dónde, con qué presupuesto, qué no puede faltar y su gusto.
     Vive en este navegador (localStorage) y, con cuenta, como alerta de tipo 'busqueda'
     con la clave 'mi-busqueda' en portal.alertas (BPStore.syncAlerta). El motor de alertas
     (api/_portal/alertas.js) entiende los filtros que ya conoce; lo demás lo usa la red.
   · La coincidencia: cuántos de sus criterios cumple cada unidad y cuáles faltan,
     para decir "coincide en 7 de 8; le falta cochera" en vez de un filtro mudo.
   · Lo que sigue: edificios, barrios y publicadores. Por ahora en este navegador;
     la tabla portal.seguimientos está escrita en portal/migracion-22-red-miembros.sql.
   · Fase 2 (3/10/2026): las piezas que comparten inicio.html, red-kit.html, demanda.html y obra.html:
     el medidor (R.progresoHTML), la búsqueda sin nombres (R.busq), la propuesta (R.prop y R.engancharProps),
     la línea de obra (R.obraLinea), el sello, las novedades y las unidades de lo que se sigue.
   Sin dependencias: usa BP (ui.js) y BPData (data.js) si están, y funciona sin ellos.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var R = {};
  var CLAVE = 'mi-busqueda';
  var LS_BUSQ = 'bp_mi_busqueda', LS_SIGO = 'bp_sigo';

  var leer = function (k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  var guardar = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  var sinTildes = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  /* ── El catálogo de la búsqueda ─────────────────────────────────────────── */
  R.ZONAS = (window.BP && BP.ZONAS) || ['Palermo', 'Recoleta', 'Retiro', 'Belgrano', 'Núñez', 'Colegiales', 'Villa Crespo', 'Puerto Madero', 'Saavedra', 'GBA Norte'];
  R.TIPOS = [
    { id: 'departamento', label: 'Departamento' }, { id: 'ph', label: 'PH' },
    { id: 'casa', label: 'Casa' }, { id: 'piso', label: 'Piso entero' }, { id: 'loft', label: 'Loft' }
  ];
  /* Lo que no puede faltar: cada uno sabe reconocerse en una unidad (amenities o cualidades verificadas). */
  R.IMPRESCINDIBLES = [
    { id: 'vista', label: 'Vista abierta', claves: ['vista abierta', 'vista al rio', 'vista'] },
    { id: 'alto', label: 'Piso alto', claves: ['piso alto'] },
    { id: 'terraza', label: 'Terraza propia', claves: ['terraza propia', 'terraza o jardin', 'terraza', 'jardin'] },
    { id: 'balcon', label: 'Balcón', claves: ['balcon'] },
    { id: 'cochera', label: 'Cochera', claves: ['cochera'] },
    { id: 'amenities', label: 'Amenities', claves: ['edificio con amenities', 'pileta', 'gimnasio', 'sum', 'seguridad'] },
    { id: 'luz', label: 'Mucha luz', claves: ['luminoso'] },
    { id: 'silencio', label: 'Silencioso', claves: ['silencioso'] },
    { id: 'mascotas', label: 'Acepta mascotas', claves: ['acepta mascotas', 'pet friendly', 'mascotas'] },
    { id: 'oficina', label: 'Lugar para trabajar', claves: ['apto home office', 'home office'] },
    { id: 'reciclado', label: 'Reciclado a nuevo', claves: ['reciclado a nuevo', 'a estrenar'] },
    { id: 'amoblado', label: 'Amoblado', claves: ['amoblado'] }
  ];
  /* El gusto: pares de estilos. La persona elige uno de cada par; el resultado es su estilo. */
  R.ESTILOS = {
    clasico: { label: 'Clásico francés', frase: 'molduras, pisos de roble, techos altos' },
    moderno: { label: 'Moderno', frase: 'líneas limpias, vidrio, plantas libres' },
    calido: { label: 'Cálido', frase: 'madera, textiles, luz baja' },
    luminoso: { label: 'Luminoso', frase: 'blanco, luz natural, ventanales' },
    industrial: { label: 'Loft', frase: 'ladrillo, hormigón, dobles alturas' },
    verde: { label: 'Con verde', frase: 'terrazas, jardines, vista a árboles' }
  };
  R.PARES = [['clasico', 'moderno'], ['calido', 'luminoso'], ['industrial', 'clasico'], ['verde', 'moderno'], ['luminoso', 'industrial'], ['calido', 'verde']];

  /* ── La búsqueda guardada ──────────────────────────────────────────────── */
  R.vacia = function () {
    return { intencion: 'comprar', para: 'vivir', zonas: [], tipos: [], ambMin: null, presupuestoMax: null, presupuestoMin: null,
      imprescindibles: [], etapa: 'cualquiera', estilos: {}, texto: '', creada: null, actualizada: null };
  };
  R.leer = function () { var b = leer(LS_BUSQ, null); return b ? Object.assign(R.vacia(), b) : null; };
  R.guardar = function (b) {
    b.actualizada = new Date().toISOString(); if (!b.creada) b.creada = b.actualizada;
    guardar(LS_BUSQ, b);
    R.aAlerta(b);
    return b;
  };
  R.borrar = function () { try { localStorage.removeItem(LS_BUSQ); } catch (e) {} };

  /* La búsqueda como alerta del portal: lo que el motor de alertas ya entiende (op, zonas, pmax, amb, amen)
     más la búsqueda entera en filtros.red, para que nada se pierda. Reusa la alerta si ya existe. */
  R.filtrosDe = function (b) {
    var op = b.intencion === 'alquilar' ? 'alquiler' : 'venta';
    var f = { op: op, zonas: (b.zonas || []).slice(), key: CLAVE };
    if (b.presupuestoMax) f.pmax = b.presupuestoMax;
    if (b.presupuestoMin) f.pmin = b.presupuestoMin;
    if (b.ambMin) f.amb = b.ambMin;
    if ((b.tipos || []).length === 1) f.tipo = b.tipos[0];
    return f;
  };
  R.aAlerta = function (b) {
    if (!(window.BP && BP.alerts)) return null;
    var lista = BP.alerts.get() || [];
    var previa = lista.find(function (a) { return a.key === CLAVE; });
    var al = { creada: (previa && previa.creada) || new Date().toISOString(), filtros: Object.assign(R.filtrosDe(b), { red: b }), url: 'mi-busqueda.html', key: CLAVE, remoteId: previa && previa.remoteId };
    var resto = lista.filter(function (a) { return a.key !== CLAVE; }); resto.push(al); BP.alerts.set(resto);
    if (window.BPStore && BPStore.syncAlerta) { try { BPStore.syncAlerta(al); } catch (e) {} }
    return al;
  };

  /* ── Cuánto está armada la búsqueda (el medidor de progreso) ───────────── */
  R.criterios = function (b) {
    var c = [];
    if (b.zonas && b.zonas.length) c.push('zona');
    if (b.tipos && b.tipos.length) c.push('tipo');
    if (b.ambMin) c.push('ambientes');
    if (b.presupuestoMax) c.push('presupuesto');
    if (b.imprescindibles && b.imprescindibles.length) c.push('imprescindibles');
    if (b.etapa && b.etapa !== 'cualquiera') c.push('etapa');
    if (Object.keys(b.estilos || {}).length >= 3) c.push('gusto');
    return c;
  };
  R.progreso = function (b) {
    var faltan = [];
    if (!b.zonas || !b.zonas.length) faltan.push('barrios');
    if (!b.presupuestoMax) faltan.push('presupuesto');
    if (!b.ambMin) faltan.push('ambientes');
    if (!b.imprescindibles || !b.imprescindibles.length) faltan.push('lo que no puede faltar');
    if (Object.keys(b.estilos || {}).length < 3) faltan.push('tu gusto');
    if (!b.tipos || !b.tipos.length) faltan.push('tipo de propiedad');
    var total = 6, hechos = total - faltan.length;
    return { porcentaje: Math.round(hechos / total * 100), faltan: faltan };
  };

  /* ── La coincidencia de una unidad con la búsqueda ──────────────────────── */
  var textoUnidad = function (a) {
    return sinTildes([].concat(a.amenities || [], a.cualidades || [], [a.titulo, a.descripcion]).join(' | '));
  };
  var tieneImprescindible = function (a, id) {
    var imp = R.IMPRESCINDIBLES.find(function (x) { return x.id === id; }); if (!imp) return false;
    if (id === 'cochera' && (a.cocheras || 0) > 0) return true;
    if (id === 'amoblado' && a.amoblado) return true;
    var t = textoUnidad(a);
    return imp.claves.some(function (k) { return t.indexOf(k) > -1; });
  };
  var opDe = function (b) { return b.intencion === 'alquilar' ? 'alquiler' : 'venta'; };
  var tipoDe = function (a) { return sinTildes(a.tipoProp || 'departamento'); };

  /* Devuelve { ok, total, cumple: [...], faltan: [...] }. ok = pasa lo que no se negocia (operación y presupuesto con 10% de margen). */
  R.coincidencia = function (a, b) {
    var cumple = [], faltan = [];
    var op = opDe(b);
    var opOk = op === 'venta' ? a.op === 'venta' : a.op !== 'venta';
    if (!opOk) return { ok: false, total: 0, cumple: [], faltan: ['operación'] };
    if (b.zonas && b.zonas.length) { if (b.zonas.indexOf(a.zona) > -1) cumple.push('Barrio'); else faltan.push('barrio'); }
    if (b.tipos && b.tipos.length) { if (b.tipos.indexOf(tipoDe(a)) > -1) cumple.push('Tipo'); else faltan.push('tipo'); }
    if (b.ambMin) { if ((a.amb || 0) >= b.ambMin) cumple.push('Ambientes'); else faltan.push(b.ambMin + ' ambientes'); }
    var precioOk = true;
    if (b.presupuestoMax && a.precio) { if (a.precio <= b.presupuestoMax) cumple.push('Presupuesto'); else { faltan.push('presupuesto'); precioOk = a.precio <= b.presupuestoMax * 1.1; } }
    (b.imprescindibles || []).forEach(function (id) {
      var imp = R.IMPRESCINDIBLES.find(function (x) { return x.id === id; }); if (!imp) return;
      if (tieneImprescindible(a, id)) cumple.push(imp.label); else faltan.push(sinTildes(imp.label) === 'cochera' ? 'cochera' : imp.label.toLowerCase());
    });
    if (b.etapa === 'pozo') { if (a.emprendimiento) cumple.push('En pozo'); else faltan.push('en pozo'); }
    if (b.etapa === 'terminado') { if (!a.emprendimiento) cumple.push('Terminado'); else faltan.push('terminado'); }
    var total = cumple.length + faltan.length;
    return { ok: precioOk && !a.reservado, total: total, cumple: cumple, faltan: faltan };
  };
  R.frase = function (c) {
    if (!c || !c.total) return 'Cumple tu búsqueda';
    if (!c.faltan.length) return 'Coincide en todo';
    return 'Coincide en ' + c.cumple.length + ' de ' + c.total + '. Le falta: ' + c.faltan.slice(0, 2).join(', ') + (c.faltan.length > 2 ? ' y ' + (c.faltan.length - 2) + ' más' : '') + '.';
  };
  R.chip = function (c) { return c && c.total ? (c.faltan.length ? 'Coincide ' + c.cumple.length + ' de ' + c.total : 'Coincide en todo') : 'Para vos'; };

  /* Las unidades de la búsqueda, mejores primero. minimo: cuántos criterios tiene que cumplir como piso (por defecto, la mitad). */
  R.coincidencias = function (avisos, b, opts) {
    opts = opts || {};
    var out = [];
    (avisos || []).forEach(function (a) {
      var c = R.coincidencia(a, b); if (!c.ok) return;
      var piso = opts.minimo != null ? opts.minimo : Math.ceil(c.total / 2);
      if (c.total && c.cumple.length < piso) return;
      out.push({ aviso: a, c: c, puntaje: c.total ? c.cumple.length / c.total : 0.5 });
    });
    /* A igual puntaje, primero la que está en uno de sus barrios, después la más nueva, después la de más fotos. */
    var enBarrio = function (x) { return x.c.faltan.indexOf('barrio') === -1 ? 1 : 0; };
    var fecha = function (x) { return new Date(x.aviso.publicadoEn || 0).getTime() || 0; };
    out.sort(function (x, y) { return (y.puntaje - x.puntaje) || (enBarrio(y) - enBarrio(x)) || (fecha(y) - fecha(x)) || ((y.aviso.fotos || []).length - (x.aviso.fotos || []).length); });
    return out;
  };

  /* ── Escribilo como lo dirías ───────────────────────────────────────────
     Un intérprete chico, sin IA ni costo: reconoce barrios, ambientes, presupuesto, tipo,
     etapa e imprescindibles en una frase y los devuelve para precompletar los chips.
     "4 ambientes con vista al río y cochera en Palermo Chico hasta 1,2 millones" */
  var BARRIOS_ALIAS = {
    'palermo': 'Palermo', 'palermo chico': 'Palermo', 'botanico': 'Palermo', 'las canitas': 'Palermo', 'canitas': 'Palermo', 'palermo soho': 'Palermo', 'palermo hollywood': 'Palermo',
    'recoleta': 'Recoleta', 'barrio norte': 'Recoleta', 'retiro': 'Retiro', 'belgrano': 'Belgrano', 'belgrano r': 'Belgrano', 'belgrano chico': 'Belgrano',
    'nunez': 'Núñez', 'colegiales': 'Colegiales', 'villa crespo': 'Villa Crespo', 'puerto madero': 'Puerto Madero', 'madero': 'Puerto Madero', 'saavedra': 'Saavedra',
    'zona norte': 'GBA Norte', 'san isidro': 'GBA Norte', 'vicente lopez': 'GBA Norte', 'olivos': 'GBA Norte', 'nordelta': 'GBA Norte', 'tigre': 'GBA Norte', 'martinez': 'GBA Norte'
  };
  var NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
  R.interpretar = function (frase) {
    /* Los puntos y comas entre dígitos son de miles o decimales ("450.000", "1,2"): se quedan. El resto de la puntuación separa. */
    var t = ' ' + sinTildes(frase).replace(/[;:!?¿¡()]/g, ' ').replace(/\.(?!\d)/g, ' ').replace(/,(?!\d)/g, ' , ') + ' ';
    var r = { zonas: [], tipos: [], imprescindibles: [] };
    if (/\b(alquil|alquiler|rentar)/.test(t)) r.intencion = 'alquilar';
    if (/\b(compr|comprar|compra)/.test(t)) r.intencion = 'comprar';
    if (/\b(invertir|inversion|renta)\b/.test(t)) r.para = 'invertir';
    Object.keys(BARRIOS_ALIAS).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) {
      if (t.indexOf(' ' + k + ' ') > -1 || t.indexOf(' ' + k + ',') > -1) { var z = BARRIOS_ALIAS[k]; if (r.zonas.indexOf(z) === -1) r.zonas.push(z); }
    });
    var m = t.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(amb|ambientes|ambiente)\b/);
    if (m) r.ambMin = NUMEROS[m[1]] || parseInt(m[1], 10);
    var d = t.match(/(\d+|un|uno|dos|tres|cuatro|cinco)\s*(dorm|dormitorios|dormitorio|habitaciones|cuartos)\b/);
    if (d && !r.ambMin) r.ambMin = (NUMEROS[d[1]] || parseInt(d[1], 10)) + 1;
    if (/monoambiente/.test(t)) r.ambMin = 1;
    /* Presupuesto: "hasta 1,2 millones", "hasta USD 650.000", "650 mil", "hasta 900k" */
    var p = t.match(/(hasta|maximo|max|tope|menos de|por debajo de)?\s*(usd|u\$s|us\$|dolares)?\s*(\d+(?:[.,]\d+)*)\s*(millones|millon|mill|mil|m|k)?\b/g);
    if (p) {
      p.forEach(function (frag) {
        var mm = frag.match(/(hasta|maximo|max|tope|menos de|por debajo de)?\s*(usd|u\$s|us\$|dolares)?\s*(\d+(?:[.,]\d+)*)\s*(millones|millon|mill|mil|m|k)?\b/);
        if (!mm || !mm[3]) return;
        var num = mm[3], unidad = mm[4] || '';
        var v;
        /* Con unidad, la coma o el punto son decimales ("1,2 millones"); sin unidad, son de miles ("450.000"). */
        var conUnidad = function (n) { return /^\d+[.,]\d{1,2}$/.test(n) ? parseFloat(n.replace(',', '.')) : parseFloat(n.replace(/[.,]/g, '')); };
        if (/^(millones|millon|mill|m)$/.test(unidad)) v = conUnidad(num) * 1e6;
        else if (/^(mil|k)$/.test(unidad)) v = conUnidad(num) * 1e3;
        else v = parseFloat(num.replace(/[.,]/g, ''));
        var esPlata = mm[1] || mm[2] || unidad === 'millones' || unidad === 'millon' || unidad === 'mil' || unidad === 'k' || v >= 10000;
        if (!esPlata || !isFinite(v) || v < 300) return;
        if (!r.presupuestoMax || v > r.presupuestoMax) r.presupuestoMax = Math.round(v);
      });
    }
    if (/\bph\b/.test(t)) r.tipos.push('ph');
    if (/\bcasa\b/.test(t)) r.tipos.push('casa');
    if (/\bloft\b/.test(t)) r.tipos.push('loft');
    if (/\b(depto|departamento|depa)\b/.test(t)) r.tipos.push('departamento');
    if (/\bpiso entero|semipiso\b/.test(t)) r.tipos.push('piso');
    if (/\b(pozo|preventa|en construccion|a estrenar en)\b/.test(t)) r.etapa = 'pozo';
    if (/\b(terminado|listo para mudarse|a estrenar)\b/.test(t) && r.etapa !== 'pozo') r.etapa = 'terminado';
    R.IMPRESCINDIBLES.forEach(function (imp) {
      var extra = { vista: ['vista al rio', 'vista al parque', 'vista abierta', 'con vista'], alto: ['piso alto', 'pisos altos', 'alto'], luz: ['luminoso', 'mucha luz', 'luz natural'], oficina: ['home office', 'para trabajar', 'escritorio'], mascotas: ['mascota', 'perro', 'gato'], amenities: ['amenities', 'pileta', 'gimnasio', 'gym'] }[imp.id] || [];
      var claves = imp.claves.concat(extra);
      if (claves.some(function (k) { return t.indexOf(' ' + k) > -1; }) && r.imprescindibles.indexOf(imp.id) === -1) r.imprescindibles.push(imp.id);
    });
    return r;
  };

  /* ── Lo que sigue ───────────────────────────────────────────────────────── */
  R.siguiendo = function () { return leer(LS_SIGO, []); };
  R.sigo = function (tipo, id) { return R.siguiendo().some(function (s) { return s.tipo === tipo && s.id === id; }); };
  R.alternarSeguir = function (tipo, id, nombre) {
    var l = R.siguiendo(); var i = l.findIndex(function (s) { return s.tipo === tipo && s.id === id; });
    if (i > -1) l.splice(i, 1); else l.push({ tipo: tipo, id: id, nombre: nombre || id, desde: new Date().toISOString() });
    guardar(LS_SIGO, l);
    R.subirSeguir(tipo, id, i === -1);
    return i === -1;
  };
  /* Con cuenta y base real, lo que sigue vive también en portal.seguimientos (migración 22).
     Si la tabla todavía no existe, la consulta falla en silencio y queda lo del navegador. */
  var conBase = function () {
    var S = window.BPStore;
    return !!(S && S.mode === 'supabase' && S.sb && S.session && !S.demo && /^[0-9a-f-]{36}$/i.test(String(S.session.id || '')));
  };
  R.subirSeguir = function (tipo, id, activo) {
    if (!conBase()) return;
    var t = BPStore.sb.schema('portal').from('seguimientos');
    var q = activo ? t.upsert({ usuario_id: BPStore.session.id, tipo: tipo, ref: id }, { onConflict: 'usuario_id,tipo,ref', ignoreDuplicates: true })
      : t.delete().eq('usuario_id', BPStore.session.id).eq('tipo', tipo).eq('ref', id);
    q.then(function () {}, function () {});
  };
  /* Trae lo que la cuenta sigue en la base y lo suma a lo de este navegador. Devuelve la lista resultante. */
  R.traerSeguimientos = async function () {
    if (!conBase()) return R.siguiendo();
    try {
      var r = await BPStore.sb.schema('portal').from('seguimientos').select('tipo,ref,creado').eq('usuario_id', BPStore.session.id);
      if (r.error || !r.data) return R.siguiendo();
      var l = R.siguiendo();
      r.data.forEach(function (f) { if (!l.some(function (s) { return s.tipo === f.tipo && s.id === f.ref; })) l.push({ tipo: f.tipo, id: f.ref, nombre: f.ref, desde: f.creado }); });
      guardar(LS_SIGO, l);
      return l;
    } catch (e) { return R.siguiendo(); }
  };
  R.ROTULO_SIGUE = { barrio: 'Barrio', edificio: 'Edificio', obra: 'Obra', publicador: 'Publica' };
  /* Las unidades disponibles hoy de lo que se sigue: el barrio, el edificio (por dirección), la obra o quien publica. */
  R.unidadesDe = function (avisos, s) {
    return (avisos || []).filter(function (a) {
      if (a.reservado) return false;
      if (s.tipo === 'barrio') return a.zona === s.id;
      if (s.tipo === 'edificio') return sinTildes(a.dir || a.titulo) === s.id;
      if (s.tipo === 'obra') return !!a.emprendimiento && sinTildes(a.emprendimiento) === sinTildes(s.id);
      if (s.tipo === 'publicador') return a.publicadorId === s.id;
      return false;
    });
  };
  R.hrefSigue = function (s) {
    if (s.tipo === 'barrio') return 'buscar.html?op=&zona=' + encodeURIComponent(s.id);
    if (s.tipo === 'edificio') return 'buscar.html?op=&q=' + encodeURIComponent(s.nombre || s.id);
    if (s.tipo === 'obra') return 'obra.html?e=' + encodeURIComponent(s.id);
    if (s.tipo === 'publicador') return 'publicadores.html#' + encodeURIComponent(s.id);
    return 'buscar.html';
  };

  /* Las coincidencias que entraron en los últimos `dias` (por fecha de publicación). */
  R.novedades = function (lista, dias) {
    var tope = (dias || 14) * 864e5, ahora = Date.now();
    return (lista || []).filter(function (x) { var t = new Date(x.aviso.publicadoEn || 0).getTime(); return t && ahora - t <= tope; });
  };
  /* Sugerencias para seguir según la búsqueda: sus barrios, los edificios con unidades que coinciden y quienes las publican. */
  R.sugerencias = function (avisos, b, max) {
    var out = [], visto = {};
    var push = function (s) { var k = s.tipo + '|' + s.id; if (visto[k]) return; visto[k] = 1; out.push(s); };
    (b.zonas || []).forEach(function (z) {
      var n = (avisos || []).filter(function (a) { return a.zona === z && !a.reservado; }).length;
      push({ tipo: 'barrio', id: z, nombre: (window.BP && BP.zonaLabel) ? BP.zonaLabel(z) : z, detalle: n ? n + (n === 1 ? ' unidad hoy' : ' unidades hoy') : 'Te avisamos cuando entre algo' });
    });
    R.coincidencias(avisos, b, { minimo: 0 }).slice(0, 12).forEach(function (x) {
      var a = x.aviso;
      if (a.emprendimiento) push({ tipo: 'obra', id: a.emprendimiento, nombre: a.emprendimiento, detalle: 'Obra en ' + ((window.BP && BP.zonaLabel) ? BP.zonaLabel(a.zona) : a.zona) });
      push({ tipo: 'edificio', id: sinTildes(a.dir || a.titulo), nombre: a.dir || a.titulo, detalle: ((window.BP && BP.zonaLabel) ? BP.zonaLabel(a.zona) : a.zona) + ' · edificio' });
      var pub = window.BPData && BPData.pub ? BPData.pub(a.publicadorId) : null;
      if (pub && pub.nombre) push({ tipo: 'publicador', id: a.publicadorId, nombre: pub.nombre, detalle: pub.badge || 'Publica en BAIREN' });
    });
    return out.slice(0, max || 8);
  };

  /* ── Formato ────────────────────────────────────────────────────────────── */
  R.usd = function (v) {
    if (!v) return '';
    if (window.BP && BP.fmtUSD) return BP.fmtUSD(v);
    return 'USD ' + Math.round(v).toLocaleString('es-AR');
  };
  R.usdCorto = function (v) {
    if (!v) return '';
    if (v >= 1e6) return 'USD ' + (v / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' M';
    if (v >= 1e3) return 'USD ' + Math.round(v / 1e3).toLocaleString('es-AR') + ' mil';
    return 'USD ' + v;
  };
  R.resumen = function (b) {
    var partes = [];
    partes.push(b.intencion === 'alquilar' ? 'Alquilar' : 'Comprar');
    if (b.tipos && b.tipos.length) partes.push(b.tipos.map(function (id) { var t = R.TIPOS.find(function (x) { return x.id === id; }); return t ? t.label.toLowerCase() : id; }).join(' o '));
    if (b.ambMin) partes.push(b.ambMin + (b.ambMin === 1 ? ' ambiente' : ' ambientes') + ' o más');
    if (b.zonas && b.zonas.length) partes.push('en ' + b.zonas.map(function (z) { return (window.BP && BP.zonaLabel) ? BP.zonaLabel(z) : z; }).join(', '));
    if (b.presupuestoMax) partes.push('hasta ' + R.usdCorto(b.presupuestoMax) + (b.intencion === 'alquilar' ? ' por mes' : ''));
    return partes.join(' · ');
  };

  /* ── Piezas que se dibujan igual en todas las páginas de la red ─────────── */
  var esc = function (s) { return (window.BP && BP.esc) ? BP.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  /* Tarjeta de unidad: foto 4:5, la coincidencia sobre la foto, dirección en serif, precio y por qué.
     Usa los mismos anchos de foto que el catálogo (700 y 900) para no pedir imágenes nuevas al servidor. */
  R.tarjeta = function (a, c, opts) {
    opts = opts || {};
    var foto = a.fotos && a.fotos[0] ? ((window.BP && BP.sbImg) ? BP.sbImg(a.fotos[0], opts.grande ? 900 : 700) : a.fotos[0]) : '';
    var href = (window.BP && BP.urlFicha) ? BP.urlFicha(a) : 'propiedad.html?id=' + encodeURIComponent(a.id);
    var zona = (window.BP && BP.zonaLabel) ? BP.zonaLabel(a.zona) : a.zona;
    var datos = [a.m2 ? a.m2 + ' m²' : '', a.amb ? a.amb + ' amb.' : '', zona].filter(Boolean).join(' · ');
    var precio = a.precio ? R.usd(a.precio) + (a.periodo ? ' por mes' : '') : 'Precio a consultar';
    return '<a class="r-card' + (opts.grande ? ' grande' : '') + '" href="' + href + '">' +
      '<div class="r-card-foto">' + (foto ? '<img src="' + esc(foto) + '" alt="' + esc(a.titulo || a.dir) + '" loading="lazy">' : '') +
      (c ? '<span class="r-coinc">' + esc(R.chip(c)) + '</span>' : '') + '</div>' +
      '<div style="display:grid;gap:6px;min-width:0">' +
      (opts.ceja ? '<p class="r-ceja" style="margin:0">' + esc(opts.ceja) + '</p>' : '') +
      '<p class="r-card-dir">' + esc(a.dir || a.titulo) + (a.unidad ? ' · ' + esc(a.unidad) : '') + '</p>' +
      '<p class="r-card-precio">' + esc(precio) + '</p>' +
      '<p class="r-dato" style="margin:0">' + esc(datos) + '</p>' +
      (c && c.total ? '<p class="r-card-porque">' + esc(R.frase(c)) + '</p>' : '') +
      '</div></a>';
  };
  var ICO = {
    inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M10 20v-6h4v6"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    propuestas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    siguiendo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
    perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4"/></svg>'
  };
  /* opts.muestra: la barra dibujada quieta, dentro de la página (el kit visual).
     opts.punto: las pestañas con algo nuevo, marcadas con un punto oro (nunca un número ni rojo). */
  R.tabbar = function (activo, opts) {
    opts = opts || {};
    var punto = opts.punto || [];
    var items = [['inicio', 'Inicio', 'inicio.html'], ['buscar', 'Buscar', 'buscar.html'], ['propuestas', 'Propuestas', 'inicio.html#propuestas'], ['siguiendo', 'Siguiendo', 'inicio.html#siguiendo'], ['perfil', 'Mi búsqueda', 'mi-busqueda.html#resultado']];
    return '<nav class="r-tabbar' + (opts.muestra ? ' muestra' : '') + '" aria-label="' + (opts.muestra ? 'Muestra de la barra de la red' : 'Red BAIREN') + '">' + items.map(function (it) {
      var hay = punto.indexOf(it[0]) > -1;
      return '<a href="' + it[2] + '"' + (it[0] === activo ? ' aria-current="page"' : '') + (hay ? ' aria-label="' + it[1] + ', hay novedades"' : '') + '>' + ICO[it[0]] + (hay ? '<i class="punto" aria-hidden="true"></i>' : '') + '<span>' + it[1] + '</span></a>';
    }).join('') + '</nav>';
  };

  /* ── Más piezas compartidas (Fase 2, 3/10/2026) ─────────────────────────── */
  /* A qué paso del asistente lleva cada cosa que falta en la búsqueda. */
  R.PASO_DE = { 'barrios': 'barrios', 'presupuesto': 'presupuesto', 'ambientes': 'tipo', 'lo que no puede faltar': 'imprescindibles', 'tu gusto': 'gusto', 'tipo de propiedad': 'tipo' };
  /* El medidor: cuánto está armada la búsqueda y qué sumar. opts.completar agrega el enlace al paso que falta. */
  R.progresoHTML = function (b, opts) {
    opts = opts || {};
    var p = R.progreso(b);
    var texto = p.faltan.length
      ? 'Tu búsqueda está al <b>' + p.porcentaje + '%</b>. Sumá ' + esc(p.faltan.slice(0, 2).join(' y ')) + ' para recibir mejores propuestas.'
      : 'Tu búsqueda está <b>completa</b>.';
    var enlace = opts.completar !== false
      ? (p.faltan.length ? '<a class="r-btn-link" href="mi-busqueda.html?paso=' + (R.PASO_DE[p.faltan[0]] || 'intencion') + '">Completar</a>' : '<a class="r-btn-link" href="mi-busqueda.html?paso=intencion">Editar</a>')
      : '';
    return '<div class="r-progreso"><div class="r-progreso-barra" role="progressbar" aria-label="Búsqueda armada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.porcentaje + '"><i style="width:' + p.porcentaje + '%"></i></div><p>' + texto + (enlace ? ' ' + enlace : '') + '</p></div>';
  };
  /* Un grupo de demanda (lo que devuelve portal.demanda_agregada): "12 compradores · 4 ambientes · Palermo · hasta USD 1,2 M". */
  R.grupoTexto = function (g) {
    var alq = g.operacion === 'alquiler';
    var n = Number(g.busquedas) || 0;
    var quien = n + ' ' + (alq ? (n === 1 ? 'inquilino' : 'inquilinos') : (n === 1 ? 'comprador' : 'compradores'));
    var amb = g.amb_min ? g.amb_min + (g.amb_min === 1 ? ' ambiente' : ' ambientes') + (g.amb_min >= 5 ? ' o más' : '') : 'Cualquier tamaño';
    var zona = g.zona ? ((window.BP && BP.zonaLabel) ? BP.zonaLabel(g.zona) : g.zona) : 'Cualquier barrio';
    var plata = g.presupuesto_hasta ? 'hasta ' + R.usdCorto(Number(g.presupuesto_hasta)) + (alq ? ' por mes' : '') : (g.presupuesto_desde ? 'más de ' + R.usdCorto(Number(g.presupuesto_desde)) + (alq ? ' por mes' : '') : 'sin tope dicho');
    return { quien: quien, resto: [amb, zona, plata].join(' · '), todo: [quien, amb, zona, plata].join(' · ') };
  };
  /* Tarjeta de búsqueda sin nombres, para el que vende. opts.boton: texto del botón; opts.datos: atributos data-* del botón. */
  R.busq = function (g, opts) {
    opts = opts || {};
    var t = R.grupoTexto(g);
    var datos = Object.keys(opts.datos || {}).map(function (k) { return ' data-' + k + '="' + esc(opts.datos[k]) + '"'; }).join('');
    return '<article class="r-busq"' + (opts.ejemplo ? ' data-ejemplo' : '') + '>' +
      (opts.ejemplo ? '<span class="r-ejemplo claro">Ejemplo</span>' : '') +
      '<b>' + esc(t.quien) + '</b><span>' + esc(t.resto) + '</span>' +
      (g.imprescindibles && g.imprescindibles.length ? '<span class="r-busq-piden">La mayoría pide: ' + esc(g.imprescindibles.map(function (id) { var x = R.IMPRESCINDIBLES.find(function (i) { return i.id === id; }); return x ? x.label.toLowerCase() : id; }).join(', ')) + '</span>' : '') +
      (opts.boton === false ? '' : '<button type="button" class="r-btn" aria-label="Enviar propuesta a ' + esc(t.todo) + '"' + datos + '>' + esc(opts.boton || 'Enviar propuesta') + '</button>') +
      '</article>';
  };
  /* Propuesta que le llega al que busca: la unidad, la nota de quien publica y dos respuestas.
     opts.nota, opts.de (quien la manda), opts.id (para engancharla), opts.ejemplo, opts.estado ('enviada'|'interesa'|'no_gracias'). */
  R.MOTIVOS = [['precio', 'Precio'], ['zona', 'Zona'], ['estado', 'Estado']];
  R.prop = function (a, opts) {
    opts = opts || {};
    var foto = a.fotos && a.fotos[0] ? ((window.BP && BP.sbImg) ? BP.sbImg(a.fotos[0], 700) : a.fotos[0]) : '';
    var href = (window.BP && BP.urlFicha) ? BP.urlFicha(a) : 'propiedad.html?id=' + encodeURIComponent(a.id);
    var zona = (window.BP && BP.zonaLabel) ? BP.zonaLabel(a.zona) : a.zona;
    var datos = [a.m2 ? a.m2 + ' m²' : '', a.amb ? a.amb + ' amb.' : '', zona].filter(Boolean).join(' · ');
    var precio = a.precio ? R.usd(a.precio) + (a.periodo ? ' por mes' : '') : 'Precio a consultar';
    var estado = opts.estado || 'enviada';
    var respuesta = estado === 'interesa' ? '<p class="r-prop-respuesta">Le dijiste que te interesa. Quien publica te va a escribir.</p>'
      : estado === 'no_gracias' ? '<p class="r-prop-respuesta">Le dijiste que no, gracias.' + (opts.motivo ? ' Motivo: ' + esc(opts.motivo) + '.' : '') + '</p>' : '';
    return '<article class="r-prop"' + (opts.id ? ' data-prop="' + esc(opts.id) + '"' : '') + '>' +
      '<div class="r-prop-cab"><p class="r-ceja" style="margin:0">Propuesta' + (opts.de ? ' de ' + esc(opts.de) : '') + '</p>' + (opts.ejemplo ? '<span class="r-ejemplo">Ejemplo</span>' : '') + '</div>' +
      '<a class="r-prop-unidad" href="' + href + '">' + (foto ? '<img src="' + esc(foto) + '" alt="' + esc(a.titulo || a.dir) + '" loading="lazy">' : '<span class="r-prop-sinfoto" aria-hidden="true"></span>') +
      '<span><b>' + esc(a.dir || a.titulo) + (a.unidad ? ' · ' + esc(a.unidad) : '') + '</b><span class="r-card-precio">' + esc(precio) + '</span><span class="r-dato">' + esc(datos) + '</span></span></a>' +
      (opts.nota ? '<p class="r-prop-nota">' + esc(opts.nota) + '</p>' : '') +
      (opts.porque ? '<p class="r-card-porque">' + esc(opts.porque) + '</p>' : '') +
      (estado === 'enviada'
        ? '<div class="r-prop-acciones"><button type="button" class="r-btn" data-resp="interesa">Me interesa</button><button type="button" class="r-btn r-btn-sec" data-resp="no_gracias">No, gracias</button></div>' +
          '<div class="r-prop-motivos" hidden><p class="r-dato" style="margin:0;width:100%">¿Por qué? Nos ayuda a mandarte mejores. Es opcional.</p>' + R.MOTIVOS.map(function (m) { return '<button type="button" class="r-chip" data-motivo="' + m[0] + '" aria-pressed="false">' + m[1] + '</button>'; }).join('') + '</div>'
        : respuesta) +
      '</article>';
  };
  /* Engancha las respuestas de las propuestas dentro de root. alResponder(id, estado, motivo) guarda; si devuelve una promesa que falla, se avisa. */
  R.engancharProps = function (root, alResponder) {
    (root || document).querySelectorAll('.r-prop').forEach(function (p) {
      if (p._r) return; p._r = true;
      var motivos = p.querySelector('.r-prop-motivos');
      var cerrar = function (estado, motivo) {
        var acc = p.querySelector('.r-prop-acciones'); if (acc) acc.remove();
        if (motivos) motivos.hidden = true;
        var r = document.createElement('p'); r.className = 'r-prop-respuesta';
        r.textContent = estado === 'interesa' ? 'Le avisamos a quien publica que te interesa. Te va a escribir.' : 'Listo. No te vamos a mandar más de esta unidad.' + (motivo ? ' Motivo: ' + motivo + '.' : '');
        p.appendChild(r);
      };
      p.querySelectorAll('[data-resp]').forEach(function (b) {
        b.addEventListener('click', function () {
          var estado = b.dataset.resp;
          if (estado === 'no_gracias' && motivos && motivos.hidden) {
            motivos.hidden = false;
            b.textContent = 'Listo';   /* segundo toque: confirma sin motivo */
            var m = motivos.querySelector('[data-motivo]'); if (m) m.focus();
            return;
          }
          var elegido = motivos && motivos.querySelector('[aria-pressed="true"]');
          var motivo = elegido ? elegido.dataset.motivo : null;
          var hecho = alResponder ? alResponder(p.dataset.prop || null, estado, motivo) : null;
          Promise.resolve(hecho).then(function () { cerrar(estado, elegido ? elegido.textContent.toLowerCase() : null); }, function () { if (window.BP && BP.toast) BP.toast('No se pudo guardar tu respuesta. Probá de nuevo.', 'error'); });
        });
      });
      if (motivos) motivos.querySelectorAll('[data-motivo]').forEach(function (c) {
        c.addEventListener('click', function () {
          var ya = c.getAttribute('aria-pressed') === 'true';
          motivos.querySelectorAll('[data-motivo]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          c.setAttribute('aria-pressed', ya ? 'false' : 'true');
          var no = p.querySelector('[data-resp="no_gracias"]'); if (no) no.textContent = 'Enviar respuesta';
        });
      });
    });
  };
  /* La línea de una obra: hitos en orden de fecha; el último es el actual (opts.actual elige otro: lo que sigue queda sin marcar).
     Cada evento: { titulo, fecha, porcentaje, nota, foto_url } como portal.obra_eventos, o fechaTexto para un texto libre. */
  R.obraLinea = function (eventos, opts) {
    opts = opts || {};
    var l = (eventos || []).slice().sort(function (x, y) { return String(x.fecha || '').localeCompare(String(y.fecha || '')); });
    var fmt = function (f) { if (!f) return ''; var d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f); return isNaN(d) ? String(f) : d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }); };
    var ultimo = opts.actual != null ? opts.actual : l.length - 1;
    return '<ol class="r-obra">' + '<i class="linea" aria-hidden="true" style="height:' + (l.length ? Math.round(((ultimo + 0.5) / l.length) * 100) : 0) + '%"></i>' + l.map(function (e, i) {
      var clase = i < ultimo ? 'hecho' : i === ultimo ? 'actual' : '';
      var foto = e.foto_url ? ((window.BP && BP.sbImg) ? BP.sbImg(e.foto_url, 700) : e.foto_url) : '';
      return '<li class="r-hito ' + clase + '"' + (i === ultimo ? ' aria-current="step"' : '') + '><b>' + esc(e.titulo) + '</b>' +
        '<span>' + esc([e.fechaTexto || fmt(e.fecha), e.porcentaje != null ? e.porcentaje + '% de la obra' : ''].filter(Boolean).join(' · ')) + '</span>' +
        (e.nota ? '<p class="r-hito-nota">' + esc(e.nota) + '</p>' : '') +
        (foto ? '<img class="r-hito-foto" src="' + esc(foto) + '" alt="' + esc(e.titulo) + '" loading="lazy">' : '') + '</li>';
    }).join('') + '</ol>';
  };
  /* Un sello: filete oro, nunca relleno. */
  R.sello = function (texto, opts) {
    opts = opts || {};
    var ico = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
    return '<span class="r-sello' + (opts.claro ? ' claro' : '') + '">' + ico + esc(texto) + '</span>';
  };

  window.BPRed = R;
})();
