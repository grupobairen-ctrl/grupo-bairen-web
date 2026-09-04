/* BAIREN · Portal (prueba) · interfaz compartida: header, footer, íconos, almacenamiento local, utilidades.
   Se carga en todas las páginas de portal/. Expone window.BP. */
(function(){
  'use strict';
  const BP = {};
  BP.ZONAS = ['Palermo','Recoleta','Belgrano','Núñez','Colegiales','Puerto Madero','Saavedra','GBA Norte'];
  BP.zonaLabel = z => z === 'GBA Norte' ? 'Zona Norte' : z;
  BP.zonaSlug = z => z.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/gba norte/,'zona-norte').replace(/\s+/g,'-');
  BP.zonaFromSlug = s => BP.ZONAS.find(z => BP.zonaSlug(z) === s) || null;
  /* URLs limpias (como Zonaprop) cuando el servidor las reescribe: Vercel (vercel.json) o el dev server de portal/test.
     Se sondea una vez por sesión; si no hay reescritura, se usan las URLs con parámetros. */
  BP.pretty = false;
  BP.probePretty = async function(){ try { const k = sessionStorage.getItem('bp_pretty'); if (k !== null) { BP.pretty = k === '1'; return BP.pretty; } const r = await fetch(new URL('_rewrite-probe', document.baseURI).href, { method: 'HEAD', cache: 'no-store' }); BP.pretty = r.ok && (r.headers.get('x-bp-rewrite') === '1'); sessionStorage.setItem('bp_pretty', BP.pretty ? '1' : '0'); if (BP.pretty && document.getElementById('pHeader') && document.querySelector('.navbar')) { BP.header(BP._active); if (window.BPStore && window.BPStore.ready) window.BPStore.ready.then(() => BP.applySession(window.BPStore.session, window.BPStore.mode)); } } catch (e) { BP.pretty = false; } return BP.pretty; };
  const TIPO_PLURAL = { departamento:'departamentos', piso:'pisos', ph:'ph', casa:'casas', todos:'propiedades' };
  const OP_SLUG = { venta:'venta', alquiler:'alquiler', mediano:'alquiler-mediano-plazo' };
  BP.urlBuscar = function(f){ f = f || {}; const p = new URLSearchParams(); if (f.op) p.set('op', f.op); if (f.tipo && f.tipo !== 'departamento') p.set('tipo', f.tipo); (f.zonas || (f.zona ? [f.zona] : [])).forEach(z => p.append('zona', z)); Object.keys(f).forEach(k => { if (['op','tipo','zona','zonas'].indexOf(k) === -1 && f[k] != null && f[k] !== '' && f[k] !== false) p.set(k, f[k] === true ? '1' : f[k]); });
    if (BP.pretty && f.op && (!f.zonas || f.zonas.length <= 1) && !f.q && !f.pub) { const zona = f.zona || (f.zonas && f.zonas[0]); const rest = new URLSearchParams(p); rest.delete('op'); rest.delete('tipo'); rest.delete('zona'); const path = TIPO_PLURAL[f.tipo || 'departamento'] + '-' + OP_SLUG[f.op] + (zona ? '-' + BP.zonaSlug(zona) : '-buenos-aires'); return path + (rest.toString() ? '?' + rest.toString() : ''); }
    return 'buscar.html' + (p.toString() ? '?' + p.toString() : ''); };
  BP.parsePretty = function(){ const m = location.pathname.match(/\/(departamentos|pisos|ph|casas|propiedades)-(venta|alquiler-mediano-plazo|alquiler)-([a-z0-9-]+)$/); if (!m) return null; const tipo = { departamentos:'departamento', pisos:'piso', ph:'ph', casas:'casa', propiedades:'todos' }[m[1]]; const op = m[2] === 'alquiler-mediano-plazo' ? 'mediano' : m[2]; const zona = m[3] === 'buenos-aires' ? null : BP.zonaFromSlug(m[3]); return { tipo, op, zona }; };
  BP.urlFicha = function(a){ return BP.pretty ? 'propiedad-' + encodeURIComponent(a.id) : 'propiedad.html?id=' + encodeURIComponent(a.id); };
  BP.idFromPath = function(){ const seg = decodeURIComponent(location.pathname.split('/').pop() || ''); return /^propiedad-/.test(seg) ? seg.replace(/^propiedad-/, '') : null; };
  BP.OPS = { venta:{label:'Comprar', h:'en venta', per:''}, alquiler:{label:'Alquilar · largo plazo', h:'en alquiler', per:'/mes'}, mediano:{label:'Alquilar · mediano plazo', h:'en alquiler a mediano plazo', per:'/mes'} };
  BP.LEYENDA_PLATAFORMA = 'BAIREN es una plataforma de propiedades y no ejerce el corretaje inmobiliario. Cada propiedad es publicada por su titular o por un corredor matriculado, responsable de la operación.';
  BP.LEYENDA_ALQUILER = '"Para los casos de alquiler de vivienda, el monto máximo de comisión que se le puede requerir a los propietarios será el equivalente al cuatro con quince centésimos por ciento (4,15%) del valor total del respectivo contrato. Se encuentra prohibido cobrar a los inquilinos que sean personas físicas comisiones inmobiliarias y gastos de gestoría de informes".';

  BP.sbImg = function(u, w){
    if (!u || u.indexOf('/storage/v1/object/public/') === -1) return u;
    return u.replace('/storage/v1/object/public/','/storage/v1/render/image/public/') + (u.indexOf('?')>-1?'&':'?') + 'width=' + w + '&quality=75';
  };
  BP.fmtUSD = n => n == null ? 'Consultar' : 'USD ' + Math.round(n).toLocaleString('es-AR');
  BP.fmtN = n => n == null ? '' : Number(n).toLocaleString('es-AR');
  BP.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  BP.qs = () => new URLSearchParams(location.search);
  BP.diasDesde = iso => { if(!iso) return null; const d=(Date.now()-new Date(iso).getTime())/864e5; return Math.max(0,Math.floor(d)); };
  BP.hace = iso => { const d=BP.diasDesde(iso); if(d==null) return ''; if(d===0) return 'Publicado hoy'; if(d===1) return 'Publicado ayer'; if(d<30) return 'Publicado hace '+d+' días'; const m=Math.floor(d/30); return 'Publicado hace '+m+(m===1?' mes':' meses'); };

  /* íconos, trazo fino */
  const I = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra||''}>${d}</svg>`;
  BP.ico = {
    bell: I('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
    chat: I('<path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12z"/>'),
    heart: I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
    heartFill: I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" fill="currentColor"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    pin: I('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
    wa: I('<path d="M3 21l1.6-4.7A9 9 0 1 1 8 19.6L3 21z"/><path d="M9 9.5c.3 2.4 2.6 4.6 5 5l1.5-1.5 2 1-.5 1.8c-3.7 1-8.3-3.5-7.5-7.3l1.8-.5 1 2L9 9.5z"/>'),
    mail: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    phone: I('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
    ruler: I('<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>'),
    bed: I('<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 15h18M7 9V7h4v2M13 9V7h4v2"/>'),
    bath: I('<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0"/>'),
    car: I('<path d="M5 17h14M6 17l1-5h10l1 5M8 12l1.5-4h5L16 12"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>'),
    door: I('<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="15" cy="12" r="1"/>'),
    cal: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    photo: I('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-6-6-8 8"/>'),
    video: I('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>'),
    share: I('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>'),
    flag: I('<path d="M5 21V4h11l-1.5 4L16 12H5"/>'),
    check: I('<path d="m5 12 5 5 9-10"/>'),
    arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    sort: I('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>'),
    map: I('<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
    shield: I('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    home: I('<path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    building: I('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>'),
    key: I('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2 2M14 9l2 2"/>'),
  };

  /* almacenamiento local (convivencia por visitante) */
  const store = key => ({ get(){ try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ return []; } }, set(v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){} } });
  BP.favs = store('bp_favs'); BP.alerts = store('bp_alertas'); BP.consultas = store('bp_consultas'); BP.reportes = store('bp_reportes');
  BP.isFav = id => BP.favs.get().indexOf(id) > -1;
  BP.toggleFav = id => { const f=BP.favs.get(); const i=f.indexOf(id); if(i>-1) f.splice(i,1); else f.push(id); BP.favs.set(f); BP.syncFavCount(); return i===-1; };
  BP.syncFavCount = () => { const n=BP.favs.get().length; document.querySelectorAll('[data-fav-count]').forEach(el=>{ el.textContent=n||''; el.hidden=!n; }); };

  BP.toast = msg => { let t=document.getElementById('bpToast'); if(!t){ t=document.createElement('div'); t.id='bpToast'; t.className='p-toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2600); };

  BP.reveal = () => { const els=document.querySelectorAll('[data-reveal]'); if(!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('in')); return; } const io=new IntersectionObserver(en=>{ en.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }); },{rootMargin:'0px 0px -8% 0px'}); els.forEach(e=>io.observe(e)); };

  /* ── Header ─────────────────────────────────────────────── */
  BP.header = function(active){ BP._active = active;
    const dd = (ttl, items) => `<div class="p-dd-ttl">${ttl}</div>` + items.map(i=>`<a href="${i[1]}">${i[0]}</a>`).join('');
    const zonasLinks = op => BP.ZONAS.map(z=>[`Departamentos ${BP.OPS[op].h} en ${BP.zonaLabel(z)}`, BP.urlBuscar({ op, zona: z })]);
    const html = `
<nav class="navbar" aria-label="Principal">
  <div class="p-nav-left">
    <a class="nav-logo" href="index.html" aria-label="BAIREN, inicio"><img src="../bairen_logo.png?v=3" alt="BAIREN" style="height:44px;width:auto;"></a>
    <div class="p-nav-menu">
      <div><button type="button" aria-haspopup="true" ${active==='venta'?'aria-current="page"':''}>Comprar <span class="car"></span></button>
        <div class="p-dd">${dd('Por barrio', zonasLinks('venta'))}${dd('Servicios', [['Publicá tu propiedad para vender','publicar.html'],['Índice BAIREN por barrio','index.html#indice'],['Guía de barrios','index.html#guia']])}</div></div>
      <div><button type="button" aria-haspopup="true" ${active==='alquiler'?'aria-current="page"':''}>Alquilar <span class="car"></span></button>
        <div class="p-dd">${dd('Operación', [['Largo plazo', BP.urlBuscar({ op:'alquiler' })],['Mediano plazo, amoblado', BP.urlBuscar({ op:'mediano' })]])}${dd('Por barrio', zonasLinks('alquiler'))}</div></div>
      <div><button type="button" aria-haspopup="true">Servicios <span class="car"></span></button>
        <div class="p-dd">${dd('Para quien publica', [['Publicá tu propiedad','publicar.html'],['Importá tu cartera por archivo','importar.html'],['Producción de fichas, fotos y video','publicar.html#produccion'],['Panel del propietario en Bairen OS','publicar.html#panel']])}${dd('Para quien busca', [['Guía de barrios','index.html#guia'],['Índice BAIREN','index.html#indice'],['Cómo evitar fraudes','legales.html#fraudes']])}</div></div>
      <a href="publicadores.html" ${active==='publicadores'?'aria-current="page"':''}>Buscar publicadores</a>
    </div>
  </div>
  <div class="p-nav-right">
    <button type="button" class="p-ghost p-bell" aria-label="Notificaciones" data-notif>${BP.ico.bell}<span class="dot" hidden></span></button>
    <a class="p-ghost" href="ingresar.html?volver=contactos">${BP.ico.chat} Mis contactos</a>
    <a class="p-ghost" href="buscar.html?favs=1" aria-label="Favoritos">${BP.ico.heart}<span data-fav-count hidden></span></a>
    <a class="p-btn p-btn-sm" href="publicar.html">Publicar</a>
    <a class="p-btn p-btn-sm p-btn-fill" href="ingresar.html">Ingresar</a>
  </div>
  <button class="burger" id="burger" type="button" aria-label="Menú" aria-expanded="false" aria-controls="mobileMenu"><span></span><span></span><span></span></button>
</nav>
<div class="mobile-menu" id="mobileMenu">
  <a href="buscar.html?op=venta" class="m-link">Comprar</a>
  <a href="buscar.html?op=alquiler" class="m-link">Alquilar</a>
  <a href="buscar.html?op=mediano" class="m-link">Mediano plazo</a>
  <a href="publicadores.html" class="m-link">Publicadores</a>
  <a href="index.html#guia" class="m-link">Guía de barrios</a>
  <div class="m-sep"></div>
  <a href="buscar.html?favs=1" class="m-link">Favoritos</a>
  <a href="ingresar.html?volver=contactos" class="m-link">Mis contactos</a>
  <div class="m-cta"><a class="p-btn p-btn-sm" href="publicar.html">Publicar</a><a class="p-btn p-btn-sm p-btn-fill" href="ingresar.html">Ingresar</a></div>
</div>`;
    const host = document.getElementById('pHeader'); if (host) host.innerHTML = html;
    const b=document.getElementById('burger'), m=document.getElementById('mobileMenu');
    if (b && m) b.addEventListener('click', () => { const o=m.classList.toggle('open'); b.classList.toggle('open',o); b.setAttribute('aria-expanded', o?'true':'false'); });
    document.querySelectorAll('[data-notif]').forEach(el=>el.addEventListener('click',()=>BP.toast('Ingresá para ver tus notificaciones.')));
    BP.syncFavCount();
  };

  /* ── Footer ─────────────────────────────────────────────── */
  BP.footer = function(){
    const zonas = BP.ZONAS.map(z=>`<li><a href="buscar.html?zona=${encodeURIComponent(z)}">${BP.zonaLabel(z)}</a></li>`).join('');
    const html = `
<footer class="footer">
  <div class="footer-grid">
    <div>
      <div><img src="../bairen_logo.png?v=3" alt="BAIREN" style="height:46px;width:auto;"></div>
      <div class="ft-brand-rule"></div>
      <p class="ft-brand-tag">Propiedades seleccionadas en Buenos Aires. Para comprar, alquilar o publicar la tuya, en CABA y Zona Norte.</p>
      <p class="p-legend">${BP.LEYENDA_PLATAFORMA}</p>
    </div>
    <div class="ft-col"><div class="ft-col-ttl">Más BAIREN</div><ul>
      <li><a href="buscar.html">Propiedades en Buenos Aires</a></li><li><a href="publicar.html">Publicar tu propiedad</a></li><li><a href="index.html#guia">Guía de barrios</a></li><li><a href="index.html#indice">Índice BAIREN</a></li><li><a href="legales.html#ayuda">Ayuda</a></li><li><a href="mailto:contacto@bairengroup.com">Contacto</a></li></ul></div>
    <div class="ft-col"><div class="ft-col-ttl">Publicadores</div><ul>
      <li><a href="publicadores.html">Inmobiliarias y corredores</a></li><li><a href="publicar.html#dueno">Dueños directos</a></li><li><a href="publicar.html#desarrolladora">Desarrolladoras</a></li><li><a href="legales.html#criterios">Criterios de selección</a></li></ul></div>
    <div class="ft-col"><div class="ft-col-ttl">Barrios</div><ul>${zonas}</ul></div>
    <div class="ft-col"><div class="ft-col-ttl">Seguinos</div><ul>
      <li><a href="https://www.instagram.com/" rel="noopener" target="_blank">Instagram</a></li><li><a href="https://www.tiktok.com/" rel="noopener" target="_blank">TikTok</a></li><li><a href="https://www.youtube.com/" rel="noopener" target="_blank">YouTube</a></li></ul>
      <div class="ft-col-ttl" style="margin-top:18px">Contacto</div>
      <p class="ft-contact-txt">contacto@bairengroup.com<br>CABA · Zona Norte, Buenos Aires</p></div>
  </div>
  <div class="footer-bottom">
    <span class="footer-copy">© 2026 Grupo Bairen. BAIREN es marca registrada.</span>
    <div class="footer-legal">
      <a href="legales.html#terminos">Términos y condiciones de uso</a>
      <a href="legales.html#contratacion">Términos de contratación</a>
      <a href="legales.html#privacidad">Política de privacidad</a>
    </div>
  </div>
</footer>
<div class="p-legal-strip"><div class="p-container">
  <div><b>Botón de arrepentimiento</b><a href="legales.html#arrepentimiento">Solicitar la revocación de una contratación</a></div>
  <div><b>Botón de baja de servicios</b><a href="legales.html#baja">Dar de baja un servicio contratado</a></div>
  <div><b>Defensa de las y los consumidores</b>Para reclamos, <a href="https://autogestion.produccion.gob.ar/consumidores" rel="noopener" target="_blank">ingresá acá</a>. Normativa: <a href="https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/texto" rel="noopener" target="_blank">Ley 24.240</a>. Consultas: consultas@consumidor.gob.ar</div>
  <div><b>Alquileres de vivienda en CABA</b>En cada aviso de alquiler publicado por un corredor se muestra la leyenda del art. 10 inc. 8 de la Ley 2340.</div>
</div></div>
<div class="p-demo-banner"><b>Web de prueba</b> · rama portal · datos reales de BAIREN más dos avisos de ejemplo</div>`;
    const host = document.getElementById('pFooter'); if (host) host.innerHTML = html;
  };

  /* ── Sesión en el header ───────────────────────────────── */
  BP.applySession = function(session, mode){
    const right = document.querySelector('.p-nav-right'); const mob = document.getElementById('mobileMenu');
    if (!right) return;
    const modeTag = mode === 'local' ? '<span class="p-badge demo" style="margin-left:6px" title="Sin conexión con el esquema portal en Supabase: los datos quedan en este navegador">modo local</span>' : '';
    if (session) {
      right.innerHTML = `<button type="button" class="p-ghost p-bell" aria-label="Notificaciones" data-notif>${BP.ico.bell}<span class="dot" hidden></span></button>
        <a class="p-ghost" href="panel.html#interesados">${BP.ico.chat} Mis contactos</a>
        <a class="p-ghost" href="buscar.html?favs=1" aria-label="Favoritos">${BP.ico.heart}<span data-fav-count hidden></span></a>
        <a class="p-btn p-btn-sm" href="publicar-aviso.html">Publicar</a>
        <div class="p-nav-menu" style="display:flex"><div><button type="button" class="p-btn p-btn-sm p-btn-fill" aria-haspopup="true" style="padding:0 14px">${BP.ico.user} Mi cuenta <span class="car" style="border-color:var(--navy-deeper)"></span></button>
          <div class="p-dd" style="left:auto;right:0"><div class="p-dd-ttl">${BP.esc(session.email)}${modeTag}</div><a href="panel.html#avisos">Mis avisos</a><a href="importar.html">Importar cartera</a><a href="panel.html#interesados">Interesados</a><a href="panel.html#contactos">Mis contactos</a><a href="buscar.html?favs=1">Favoritos</a><a href="panel.html#alertas">Búsquedas y alertas</a><a href="panel.html#cuenta">Mi cuenta</a><a href="curacion.html" data-curador hidden>Curación BAIREN</a><a href="#" data-logout>Cerrar sesión</a></div></div></div>`;
      if (mob) { const cta = mob.querySelector('.m-cta'); if (cta) cta.innerHTML = `<a class="p-btn p-btn-sm" href="publicar-aviso.html">Publicar</a><a class="p-btn p-btn-sm p-btn-fill" href="panel.html">Mi cuenta</a>`; }
      right.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); await window.BPStore.signOut(); BP.toast('Sesión cerrada.'); setTimeout(() => location.href = 'index.html', 600); }));
      if (window.BPStore) window.BPStore.isCurador().then(ok => { right.querySelectorAll('[data-curador]').forEach(a => a.hidden = !ok); });
    } else if (mode === 'local') {
      const ing = right.querySelector('a[href="ingresar.html"]'); if (ing && !ing.dataset.tagged) { ing.dataset.tagged = '1'; ing.insertAdjacentHTML('afterend', modeTag); }
    }
    document.querySelectorAll('[data-notif]').forEach(el => el.addEventListener('click', () => BP.toast(session ? 'No tenés notificaciones nuevas.' : 'Ingresá para ver tus notificaciones.')));
    BP.syncFavCount();
  };
  BP.estadoLabel = e => ({ borrador:'Borrador', en_revision:'En revisión', publicado:'Publicado', rechazado:'Rechazado', pausado:'Pausado', vencido:'Vencido' })[e] || e;
  BP.estadoBadge = e => `<span class="p-badge ${e==='publicado'?'':e==='rechazado'?'demo':'dueno'}">${BP.estadoLabel(e)}</span>`;

  window.BP = BP;
})();
