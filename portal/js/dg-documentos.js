/* BAIREN · Portal · Documentos y firma electrónica (riel de documentos, migración 30, 9/10/2026).
   Quien publica prepara la reserva o el contrato desde la operación; cada parte lo lee y lo firma en documento.html con
   firma electrónica (Ley 25.506): nombre y DNI tipeados, fecha, IP y la huella SHA-256 del texto.
   · Con base: las funciones de la migración 30 (generar_documento, firmar_documento, anular_documento, documentos_de,
     documento_detalle). La base arma el texto, calcula la huella y registra los pasos.
   · Sin base (modo local): lo mismo con localStorage (bp_dg_docs, bp_dg_firmas) y las mismas reglas; la huella se calcula
     con crypto.subtle.
   En mensajes.html se enchufa con BPDigital (un solo chip por momento: "Preparar reserva", "Preparar contrato" o
   "Revisar y firmar") y suma la sección "Firmas". documento.html usa window.BPDocumentos.
   Nada de venta: la reserva y el boleto de compra los hace el corredor con el escribano. */
(function(){
  'use strict';
  const VER = '20261009c';
  const T = (k, d) => (window.BP && BP.t) ? BP.t('dg_documentos_' + k, d) : d;
  const TF = (k, d, v) => (window.BP && BP.tf) ? BP.tf('dg_documentos_' + k, d, v) : String(d).replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DG = () => window.BPDigital;
  const S = () => window.BPStore;

  /* ── Los modelos: copia exacta de la migración 30 (test/rieles/documentos.mjs lo verifica) ── */
  /*PLANTILLAS:INICIO*/
  const PLANTILLAS = {
    "reserva": {
      "version": 1,
      "titulo": "Reserva de locación",
      "cuerpo": "# Reserva de locación\n\n> Modelo base · a validar por el abogado de BAIREN antes de usar.\n\nEn la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman esta reserva:\n\n- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «quien publica»); y\n- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «quien reserva»).\n\n## 1. Objeto\n\nQuien reserva ofrece alquilar el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}), con destino a {{destino}}, en estas condiciones:\n\n- Inicio previsto: {{fecha_inicio}}.\n- Plazo: {{plazo}}.\n- Precio: {{precio}}, en {{moneda_nombre}}.\n- Depósito en garantía: {{deposito}}.\n\nQuien publica acepta la oferta y, mientras la reserva esté vigente, no ofrece el inmueble a otras personas.\n\n## 2. Seña\n\nQuien reserva entrega una seña de **{{sena}}**. La recibe directamente quien publica, en la cuenta que indique por escrito. BAIREN no recibe, no retiene ni administra dinero de las partes.\n\nSi se firma el contrato, la seña se toma como pago a cuenta del precio.\n\n## 3. Vencimiento\n\nEsta reserva vence el **{{vence}}**. Si para esa fecha el contrato no está firmado, la reserva queda sin efecto, sin necesidad de aviso, y quien publica devuelve la seña completa a quien reserva, en la misma moneda, dentro de los 5 días hábiles siguientes y sin descuentos.\n\n## 4. Costos\n\nFirmar esta reserva no le cuesta nada a quien reserva: BAIREN no le cobra tarifas ni servicios.\n\n## 5. El papel de BAIREN\n\nBAIREN es una plataforma tecnológica. No es parte de esta reserva, no actúa como corredor inmobiliario y no garantiza las obligaciones de las partes.\n\n## 6. Firma electrónica\n\nLas partes firman esta reserva con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.\n\n## 7. Datos personales\n\nLos datos de esta reserva se usan solo para esta operación (Ley 25.326). Cada parte puede pedir el acceso, la corrección o la baja de sus datos."
    },
    "contrato_mediano": {
      "version": 1,
      "titulo": "Locación de vivienda amoblada · mediano plazo",
      "cuerpo": "# Contrato de locación de vivienda amoblada\n\n*Mediano plazo*\n\n> Modelo base · a validar por el abogado de BAIREN antes de usar.\n\nEn la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman este contrato:\n\n- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «la parte locadora»); y\n- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «la parte locataria»).\n\n## 1. Inmueble y destino\n\nLa parte locadora da en locación a la parte locataria el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}), amoblado y equipado según el inventario que forma parte de este contrato. El destino es exclusivamente vivienda de la parte locataria y de quienes convivan con ella.\n\n## 2. Plazo\n\nEl plazo es de **{{plazo}}**: empieza el {{fecha_inicio}} y termina el {{fecha_fin}}. Al terminar, la parte locataria devuelve el inmueble libre de personas y con los bienes del inventario.\n\n## 3. Precio y moneda\n\nEl precio es de **{{precio}}**, en {{moneda_nombre}}. Las partes eligen libremente esa moneda (artículo 765 del Código Civil y Comercial, con la redacción del DNU 70/2023), y la parte locataria cumple solo si paga en la moneda pactada. {{ajuste}}\n\nEl alquiler se paga por mes adelantado, del 1 al 10 de cada mes, por transferencia a la cuenta que indique por escrito la parte locadora. BAIREN no recibe ni administra pagos.\n\n## 4. Depósito en garantía\n\nDepósito: **{{deposito}}**. Si hay depósito, se entrega al firmar, en la misma moneda del precio, y se devuelve al recibir el inmueble, descontando solo deudas de servicios o expensas y daños que no sean el desgaste normal por el uso.\n\n## 5. Servicios incluidos\n\nServicios incluidos en el precio: {{servicios}}. Los consumos que no figuren acá los paga la parte locataria. Las expensas extraordinarias y los impuestos del inmueble los paga la parte locadora.\n\n## 6. Inventario y estado\n\nAl entregar el inmueble, las partes firman el inventario de muebles, artefactos y equipamiento, con su estado. La parte locataria cuida esos bienes, no los retira del inmueble y los devuelve en el mismo estado, salvo el desgaste normal por el uso.\n\n## 7. Uso y cuidado\n\nLa parte locataria no puede subalquilar, ceder el contrato, cambiar el destino ni hacer obras sin autorización escrita de la parte locadora. Respeta el reglamento de copropiedad del edificio.\n\n## 8. Rescisión anticipada\n\nLa parte locataria puede terminar el contrato antes del plazo, avisando por escrito. En ese caso paga a la parte locadora el 10 % del saldo del alquiler que faltaba pagar hasta el final del plazo (artículo 1221 del Código Civil y Comercial, con la redacción del DNU 70/2023).\n\n## 9. El papel de BAIREN\n\nBAIREN es una plataforma tecnológica. No es parte de este contrato, no actúa como corredor inmobiliario, no recibe dinero de las partes y no garantiza sus obligaciones. La parte locataria no le paga nada a BAIREN por este contrato.\n\n## 10. Firma electrónica\n\nLas partes firman este contrato con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.\n\n## 11. Notificaciones y jurisdicción\n\nLas partes aceptan como domicilio electrónico el correo de su cuenta de BAIREN, donde valen las notificaciones de este contrato. Ante cualquier conflicto, se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires."
    },
    "contrato_tradicional": {
      "version": 1,
      "titulo": "Locación de vivienda · alquiler a largo plazo",
      "cuerpo": "# Contrato de locación de vivienda\n\n*Alquiler a largo plazo*\n\n> Modelo base · a validar por el abogado de BAIREN antes de usar.\n\nEn la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman este contrato:\n\n- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «la parte locadora»); y\n- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «la parte locataria»).\n\n## 1. Inmueble y destino\n\nLa parte locadora da en locación a la parte locataria el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}). El destino es exclusivamente vivienda de la parte locataria y de quienes convivan con ella. Las partes dejan constancia del estado del inmueble en un acta con fotos, que firman al entregar las llaves.\n\n## 2. Plazo\n\nEl plazo es de **{{plazo}}**: empieza el {{fecha_inicio}} y termina el {{fecha_fin}}. Las partes lo pactan libremente (DNU 70/2023). Al terminar, la parte locataria devuelve el inmueble libre de personas y de cosas, en el estado del acta, salvo el desgaste normal por el uso.\n\n## 3. Precio y moneda\n\nEl precio inicial es de **{{precio}}**, en {{moneda_nombre}}. Las partes eligen libremente esa moneda (artículo 765 del Código Civil y Comercial, con la redacción del DNU 70/2023), y la parte locataria cumple solo si paga en la moneda pactada.\n\nEl alquiler se paga por mes adelantado, del 1 al 10 de cada mes, por transferencia a la cuenta que indique por escrito la parte locadora. BAIREN no recibe ni administra pagos.\n\n## 4. Ajuste\n\n{{ajuste}} Las partes eligen libremente el índice y la periodicidad del ajuste (DNU 70/2023).\n\n## 5. Depósito en garantía\n\nDepósito: **{{deposito}}**. Si hay depósito, se entrega al firmar, en la misma moneda del precio, y se devuelve al recibir el inmueble, descontando solo deudas de servicios o expensas y daños que no sean el desgaste normal por el uso.\n\n## 6. Garantía\n\n{{garantia}}\n\n## 7. Expensas, servicios e impuestos\n\nLa parte locataria paga los servicios que consume y las expensas ordinarias. La parte locadora paga las expensas extraordinarias y los impuestos que gravan el inmueble.\n\n## 8. Uso y cuidado\n\nLa parte locataria no puede subalquilar, ceder el contrato, cambiar el destino ni hacer obras sin autorización escrita de la parte locadora. Respeta el reglamento de copropiedad del edificio.\n\n## 9. Rescisión anticipada\n\nLa parte locataria puede terminar el contrato antes del plazo, avisando por escrito. En ese caso paga a la parte locadora el 10 % del saldo del alquiler que faltaba pagar hasta el final del plazo (artículo 1221 del Código Civil y Comercial, con la redacción del DNU 70/2023).\n\n## 10. El papel de BAIREN\n\nBAIREN es una plataforma tecnológica. No es parte de este contrato, no actúa como corredor inmobiliario, no recibe dinero de las partes y no garantiza sus obligaciones. La parte locataria no le paga nada a BAIREN por este contrato.\n\n## 11. Firma electrónica\n\nLas partes firman este contrato con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.\n\n## 12. Notificaciones y jurisdicción\n\nLas partes aceptan como domicilio electrónico el correo de su cuenta de BAIREN, donde valen las notificaciones de este contrato. Ante cualquier conflicto, se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires."
    },
    "contrato_temporario": {
      "version": 1,
      "titulo": "Alojamiento turístico · estadía corta (hasta 3 meses)",
      "cuerpo": "# Contrato de alojamiento turístico\n\n*Estadía corta (hasta 3 meses)*\n\n> Modelo base · a validar por el abogado de BAIREN antes de usar.\n\nEn la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman este contrato:\n\n- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «el anfitrión»); y\n- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «el huésped»).\n\n## 1. Inmueble y registro\n\nEl anfitrión ofrece al huésped alojamiento en el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}), amoblado y equipado. El inmueble está inscripto en el registro de la Ciudad que exige la Ley 6255 con el número **{{registro}}**.\n\n## 2. Destino\n\nEl alojamiento tiene fines turísticos y no es vivienda permanente. Pueden alojarse {{huespedes}}.\n\n## 3. Plazo\n\nLa estadía es de **{{plazo}}**: el ingreso es el {{fecha_inicio}} y el egreso, el {{fecha_fin}}, en los horarios que acuerden las partes. No se renueva sola y, sumada a otras estadías seguidas, no puede pasar de 3 meses.\n\n## 4. Precio\n\nEl precio es de **{{precio}}**, en {{moneda_nombre}}. Se paga directamente al anfitrión, en la forma que acuerden las partes por escrito. BAIREN no recibe ni administra pagos.\n\n## 5. Depósito\n\nDepósito: **{{deposito}}**. Si hay depósito, se devuelve dentro de los 5 días hábiles del egreso, descontando solo daños que no sean el desgaste normal por el uso y faltantes del inventario.\n\n## 6. Servicios incluidos\n\nServicios incluidos en el precio: {{servicios}}.\n\n## 7. Inventario y convivencia\n\nEl huésped recibe el inmueble con el inventario de muebles y equipamiento, cuida esos bienes y los devuelve en el mismo estado, salvo el desgaste normal por el uso. Respeta el reglamento del edificio y la tranquilidad de los vecinos, y no puede subalquilar ni ceder la estadía.\n\n## 8. El papel de BAIREN\n\nBAIREN es una plataforma tecnológica. No es parte de este contrato, no actúa como corredor inmobiliario, no recibe dinero de las partes y no garantiza sus obligaciones.\n\n## 9. Firma electrónica\n\nLas partes firman este contrato con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.\n\n## 10. Notificaciones y jurisdicción\n\nLas partes aceptan como domicilio electrónico el correo de su cuenta de BAIREN, donde valen las notificaciones de este contrato. Ante cualquier conflicto, se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires."
    }
  };
  /*PLANTILLAS:FIN*/

  /* ── Formato (igual que las funciones portal._doc_* de la base) ── */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dos = n => String(n).padStart(2, '0');
  const ymd = (y, m, d) => y + '-' + dos(m) + '-' + dos(d);
  const partesFecha = s => String(s).slice(0, 10).split('-').map(Number);
  const fechaLarga = s => { if (!s) return '—'; const [y, m, d] = partesFecha(s); return d + ' de ' + MESES[m - 1] + ' de ' + y; };
  const sumarMeses = (s, n) => { let [y, m, d] = partesFecha(s); m += n; y += Math.floor((m - 1) / 12); m = (((m - 1) % 12) + 12) % 12 + 1; const ult = new Date(Date.UTC(y, m, 0)).getUTCDate(); return ymd(y, m, Math.min(d, ult)); };
  const sumarDias = (s, n) => { const [y, m, d] = partesFecha(s); const t = new Date(Date.UTC(y, m - 1, d + n)); return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  const TZ = 'America/Argentina/Buenos_Aires';
  const diaBA = v => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(v));
  const horaBA = v => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(v));
  const monto = (n, mon) => {
    if (n == null || n === '' || !isFinite(+n)) return '—';
    const v = Math.round(Math.abs(+n) * 100) / 100, ent = Math.trunc(v), dec = Math.round((v - ent) * 100);
    return (mon === 'ARS' ? '$ ' : 'USD ') + String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dos(dec) : '');
  };
  const plazoTxt = (meses, dias) => dias != null ? dias + (dias === 1 ? ' día' : ' días') : meses != null ? meses + (meses === 1 ? ' mes' : ' meses') : '—';
  const txt = (s, max) => { const x = String(s == null ? '' : s).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim(); return x || null; };
  const dniNorm = s => String(s == null ? '' : s).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const dniFmt = s => /^[0-9]+$/.test(s) ? s.replace(/(\d)(?=(\d{3})+$)/g, '$1.') : s;
  const num = v => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); if (!isFinite(n)) throw new Error(T('err_dato', 'Revisá los datos: hay una fecha o un número mal escrito.')); return n; };
  const entero = v => { const n = num(v); return n == null ? null : Math.round(n); };
  const lineaDe = (tipo, etapa, plazo) => (DG() && DG().lineaDe) ? DG().lineaDe(tipo, etapa, plazo) : null;

  /* ── La huella: SHA-256 del texto en UTF-8, en hexadecimal (igual que extensions.digest en la base) ── */
  async function huella(texto){
    if (!(window.crypto && crypto.subtle)) throw new Error(T('err_huella', 'Este navegador no puede calcular la huella del documento.'));
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(texto)));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const huellaCorta = h => h ? String(h).slice(0, 8) + '…' + String(h).slice(-8) : '';

  /* ── Markdown simple: # título, ## cláusula, - lista, > leyenda, **negrita**, *cursiva* ── */
  function md(src){
    const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
    const out = []; let p = [], ul = [], cita = [];
    const cerrar = () => {
      if (p.length) { out.push('<p>' + inl(p.join(' ')) + '</p>'); p = []; }
      if (ul.length) { out.push('<ul>' + ul.map(x => '<li>' + inl(x) + '</li>').join('') + '</ul>'); ul = []; }
      if (cita.length) { out.push('<blockquote><p>' + inl(cita.join(' ')) + '</p></blockquote>'); cita = []; }
    };
    String(src || '').split(/\r?\n/).forEach(l => {
      let m;
      if (!l.trim()) { cerrar(); return; }
      if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { cerrar(); const n = m[1].length; out.push('<h' + n + '>' + inl(m[2]) + '</h' + n + '>'); return; }
      if ((m = /^-\s+(.*)$/.exec(l))) { if (p.length || cita.length) { const u = ul; ul = []; cerrar(); ul = u; } ul.push(m[1]); return; }
      if ((m = /^>\s?(.*)$/.exec(l))) { if (p.length || ul.length) cerrar(); cita.push(m[1]); return; }
      if (ul.length || cita.length) cerrar();
      p.push(l.trim());
    });
    cerrar();
    return out.join('\n');
  }

  /* ── Armar el texto (modo local; la base hace lo mismo en portal.generar_documento) ── */
  const E = msg => new Error(msg);
  function armar(o){
    const op = o.op, a = o.aviso || {}, pb = o.publicador || {}, it = o.interesado || {}, tipo = o.tipo, d = o.datos || {};
    const ahora = o.ahora || new Date();
    let inicio = d.fecha_inicio ? String(d.fecha_inicio).slice(0, 10) : null;
    if (inicio && !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) throw E(T('err_dato', 'Revisá los datos: hay una fecha o un número mal escrito.'));
    let meses = entero(d.plazo_meses), dias = entero(d.plazo_dias);
    const precio = num(d.monto), dep = num(d.deposito), sena = num(d.sena), huespedes = entero(d.huespedes);
    const vence = d.vence ? new Date(d.vence) : null;
    if (vence && isNaN(vence)) throw E(T('err_dato', 'Revisá los datos: hay una fecha o un número mal escrito.'));
    const moneda = /^(USD|ARS)$/.test(d.moneda || '') ? d.moneda : (op.moneda || 'USD');
    const servicios = txt(d.servicios, 300), ajuste = txt(d.ajuste, 300), garantia = txt(d.garantia, 300), registro = txt(d.registro, 60);
    if (!inicio) throw E(T('err_inicio', 'Falta la fecha de inicio.'));
    const hoy = diaBA(ahora), dif = (Date.UTC(...partesFecha(inicio)) - Date.UTC(...partesFecha(hoy))) / 864e5;
    if (dif < -30 || dif > 400) throw E(T('err_inicio_mal', 'Revisá la fecha de inicio.'));
    if (precio == null || precio <= 0) throw E(T('err_precio', 'Falta el precio.'));
    if (dep != null && dep < 0) throw E(T('err_deposito', 'El depósito no puede ser negativo.'));
    if (huespedes != null && (huespedes < 1 || huespedes > 20)) throw E(T('err_huespedes', 'Revisá la cantidad de huéspedes (de 1 a 20).'));
    let linea = op.linea;
    if (op.tipo === 'mediano' && meses != null) linea = lineaDe('mediano', o.etapaAviso || null, meses);
    if (linea === 'temporario') {
      if (dias == null && meses == null) throw E(T('err_plazo_estadia', 'Falta el plazo de la estadía.'));
      if (dias != null) { meses = null; if (dias < 1 || dias > 92) throw E(T('err_estadia_92', 'La estadía corta es de hasta 3 meses (92 días).')); }
      else if (meses < 1 || meses > 3) throw E(T('err_estadia_3', 'La estadía corta es de hasta 3 meses.'));
    } else if (linea === 'mediano' || linea === 'tradicional') {
      dias = null;
      if (meses == null || meses < 1 || meses > 120) throw E(T('err_plazo', 'Falta el plazo en meses (de 1 a 120).'));
    } else throw E(T('err_linea', 'Esta operación no admite documentos de alquiler.'));
    let venceDoc;
    if (tipo === 'reserva') {
      if (sena == null || sena <= 0) throw E(T('err_sena', 'Falta el monto de la seña.'));
      if (!vence) throw E(T('err_vence', 'Falta el vencimiento de la reserva.'));
      if (vence <= ahora) throw E(T('err_vence_pasado', 'El vencimiento tiene que ser un día y una hora que todavía no pasaron.'));
      if (vence > new Date(ahora.getTime() + 60 * 864e5)) throw E(T('err_vence_60', 'La reserva puede vencer, como mucho, en 60 días.'));
      venceDoc = vence.toISOString();
    } else {
      if (linea === 'temporario' && !registro) throw E(T('err_registro', 'Falta el número de registro de la Ley 6255 (estadía corta).'));
      if (linea === 'tradicional' && !ajuste) throw E(T('err_ajuste', 'Falta cómo se ajusta el precio (índice y cada cuánto).'));
      venceDoc = new Date(ahora.getTime() + 15 * 864e5).toISOString();
    }
    const modelo = tipo === 'reserva' ? 'reserva' : 'contrato_' + linea;
    const tpl = PLANTILLAS[modelo]; if (!tpl) throw E(T('err_modelo', 'No hay un modelo activo para este documento.'));
    const fin = dias != null ? sumarDias(inicio, dias) : sumarDias(sumarMeses(inicio, meses), -1);
    const total = dias != null ? precio : precio * meses;
    const dniI = dniNorm(it.dni);
    const vals = {
      fecha_documento: fechaLarga(hoy),
      publicador_nombre: (pb.razon_social && pb.razon_social.trim()) || (pb.nombre && pb.nombre.trim()) || 'Quien publica',
      publicador_cuit: pb.cuit && String(pb.cuit).trim() ? ', CUIT ' + String(pb.cuit).trim() : '',
      publicador_caracter: pb.tipo === 'dueno' ? 'en su carácter de propietario del inmueble' : 'en representación del propietario del inmueble, con facultades suficientes para este acto',
      interesado_nombre: (it.nombre && String(it.nombre).trim()) || 'Quien firma al pie',
      interesado_doc: dniI ? 'DNI ' + dniFmt(dniI) : 'con el documento que figura en su firma',
      inmueble_direccion: ((a.direccion || '') + (a.unidad && String(a.unidad).trim() ? ', unidad ' + String(a.unidad).trim() : '')).trim() || a.titulo || '—',
      inmueble_barrio: (a.barrio && String(a.barrio).trim()) || '—',
      inmueble_codigo: (a.codigo && String(a.codigo).trim()) || '—',
      destino: linea === 'temporario' ? 'una estadía corta con fines turísticos' : 'vivienda',
      fecha_inicio: fechaLarga(inicio),
      fecha_fin: fechaLarga(fin),
      plazo: plazoTxt(meses, dias),
      precio: monto(precio, moneda) + (dias != null ? ' por toda la estadía' : ' por mes') + (linea === 'temporario' && dias == null ? ' (' + monto(total, moneda) + ' por toda la estadía)' : ''),
      moneda_nombre: moneda === 'ARS' ? 'pesos argentinos' : 'dólares estadounidenses',
      deposito: dep != null && dep > 0 ? monto(dep, moneda) : 'sin depósito',
      sena: monto(sena, moneda),
      vence: vence ? fechaLarga(diaBA(vence)) + ' a las ' + horaBA(vence) + ' h' : '—',
      servicios: servicios || 'ninguno',
      ajuste: ajuste ? 'El precio se ajusta así: ' + ajuste.replace(/\.+$/, '') + '.' : 'El precio se mantiene fijo durante todo el plazo.',
      garantia: garantia ? 'La parte locataria ofrece como garantía: ' + garantia.replace(/\.+$/, '') + '. Es la que eligió: nadie le impone una empresa de garantías ni una aseguradora.'
        : 'Las partes acuerdan la garantía por separado. La parte locataria puede ofrecer la que prefiera: nadie le impone una empresa de garantías ni una aseguradora.',
      registro: registro || '—',
      huespedes: huespedes != null ? 'hasta ' + huespedes + (huespedes === 1 ? ' persona' : ' personas') : 'las personas que acuerden las partes'
    };
    let texto = tpl.cuerpo;
    Object.keys(vals).forEach(k => { texto = texto.split('{{' + k + '}}').join(String(vals[k] == null ? '—' : vals[k]).replace(/[{}]/g, '')); });
    texto = texto.replace(/\{\{[a-z_]+\}\}/g, '—');
    const limpio = x => { const r = {}; Object.keys(x).forEach(k => { if (x[k] != null) r[k] = x[k]; }); return r; };
    return {
      modelo, plantilla: tpl, contenido: texto, linea, vence_en: venceDoc,
      datos: limpio({ fecha_inicio: inicio, fecha_fin: fin, plazo_meses: meses, plazo_dias: dias, monto: precio, moneda, deposito: dep, sena, vence: vence ? vence.toISOString() : null,
        servicios, ajuste, garantia, registro, huespedes, monto_total: total, linea }),
      cambiosOp: (op.tipo === 'mediano' && meses != null && (op.plazo_meses !== meses || op.linea !== linea)) ? { plazo_meses: meses, linea } : null
    };
  }

  /* ── Estado de un documento y nombres de las partes ── */
  const vencido = x => x.estado === 'enviado' && x.vence_en && new Date(x.vence_en) <= new Date();
  const estadoDe = x => vencido(x) ? 'vencido' : x.estado;
  const ROL = {
    reserva: { publicador: () => T('rol_pub_reserva', 'quien publica'), interesado: () => T('rol_int_reserva', 'quien reserva') },
    contrato_mediano: { publicador: () => T('rol_locadora', 'la parte locadora'), interesado: () => T('rol_locataria', 'la parte locataria') },
    contrato_tradicional: { publicador: () => T('rol_locadora', 'la parte locadora'), interesado: () => T('rol_locataria', 'la parte locataria') },
    contrato_temporario: { publicador: () => T('rol_anfitrion', 'el anfitrión'), interesado: () => T('rol_huesped', 'el huésped') }
  };
  const rol = (x, lado) => { const r = ROL[x && x.plantilla_tipo] || ROL.reserva; return r[lado] ? r[lado]() : lado; };
  const QUIEN = { publicador: () => T('quien_publica', 'quien publica'), interesado: () => T('quien_busca', 'quien busca') };
  /* "la reserva" / "el contrato" */
  const elDoc = x => x && x.tipo === 'reserva' ? T('la_reserva', 'la reserva') : T('el_contrato', 'el contrato');
  const ordenLado = l => l === 'interesado' ? 0 : 1;

  /* ── Base o local ── */
  const conBase = () => !!(DG() && DG().conBase && DG().conBase());
  const sesion = () => { const s = S() && S().session; if (!s) throw E(T('err_sesion', 'Ingresá para seguir.')); return s; };
  const L = () => { const l = DG()._local; return { docs: l.LS('bp_dg_docs'), firmas: l.LS('bp_dg_firmas') }; };
  const ahoraISO = () => new Date().toISOString();
  /* Identidad en modo local: si el módulo de identidad expone BPIdentidad.estado(), firmar exige 'verificada' (como la columna en la base) */
  const identidadRequeridaLocal = () => !!(window.BPIdentidad && typeof window.BPIdentidad.estado === 'function');
  async function identidadOkLocal(){ if (!identidadRequeridaLocal()) return true; try { return (await window.BPIdentidad.estado()) === 'verificada'; } catch (e) { return false; } }
  const firmasLocal = id => L().firmas.get([]).filter(f => f.documento_id === id).sort((a, b) => String(a.firmado_en).localeCompare(String(b.firmado_en)));
  const resumen = x => ({ id: x.id, tipo: x.tipo, titulo: x.titulo, estado: x.estado, hash: x.hash, partes: x.partes, datos: x.datos, vence_en: x.vence_en,
    creado_en: x.creado_en, firmado_en: x.firmado_en, anulado_en: x.anulado_en, motivo_anulacion: x.motivo_anulacion, plantilla_tipo: x.plantilla_tipo,
    plantilla_version: x.plantilla_version, firmable: !!x.contenido, firmas: firmasLocal(x.id).map(f => ({ lado: f.lado, nombre: f.nombre, firmado_en: f.firmado_en })) });
  async function opYLados(opId){
    const op = DG()._local.ops().find(o => o.id === opId); if (!op) throw E(T('err_no_op', 'La operación no existe.'));
    return { op, lados: await DG()._local.ladosLocal(op) };
  }
  const nombreDeMail = m => { const x = String(m || '').split('@')[0].split('.')[0]; return x ? x.charAt(0).toUpperCase() + x.slice(1) : ''; };

  /* Los documentos de una operación, con sus firmas (quién y cuándo) */
  async function listar(opId){
    sesion();
    if (conBase()) return (await DG().rpc('documentos_de', { p_op: opId })) || [];
    const { lados } = await opYLados(opId); if (!lados.length) throw E(T('err_no_parte', 'No sos parte de esta operación.'));
    return L().docs.get([]).filter(x => x.operacion_id === opId).sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en))).map(resumen);
  }

  /* Un documento con su texto, el registro de firmas y lo que puede hacer la sesión */
  async function detalle(docId){
    const ses = sesion();
    if (conBase()) return DG().rpc('documento_detalle', { p_doc: docId });
    const d = L().docs.get([]).find(x => x.id === docId); if (!d) throw E(T('err_no_doc', 'El documento no existe.'));
    const { op, lados } = await opYLados(d.operacion_id); if (!lados.length) throw E(T('err_no_parte', 'No sos parte de esta operación.'));
    const fs = firmasLocal(d.id), plat = lados.indexOf('plataforma') > -1;
    const ladoFirma = (d.partes || []).filter(l => lados.indexOf(l) > -1 && !fs.some(f => f.lado === l)).sort((a, b) => ordenLado(a) - ordenLado(b))[0] || null;
    return {
      documento: Object.assign({}, d), lados, lado_firma: ladoFirma,
      puede_firmar: !!(ladoFirma && d.contenido && d.estado === 'enviado' && !vencido(d)),
      puede_anular: (d.estado === 'borrador' || d.estado === 'enviado') && lados.indexOf('publicador') > -1,
      identidad_requerida: identidadRequeridaLocal(), identidad_ok: await identidadOkLocal(),
      operacion: { id: op.id, etapa: op.etapa, linea: op.linea },
      aviso: op.aviso ? { titulo: op.aviso.titulo, barrio: op.aviso.barrio, codigo: op.aviso.codigo } : null,
      firmas: fs.map(f => { const mia = f.auth_uid === ses.id; return Object.assign({ lado: f.lado, nombre: f.nombre, dni: f.dni, firmado_en: f.firmado_en, hash: f.hash, mia }, (plat || mia) ? { ip: f.ip, user_agent: f.user_agent } : {}); })
    };
  }

  /* Preparar: tipo 'reserva' | 'contrato'. datos: { fecha_inicio, plazo_meses | plazo_dias, monto, moneda, deposito, sena, vence,
     servicios, ajuste, garantia, registro, huespedes }. Devuelve el id del documento. */
  async function generar(opId, tipo, datos){
    const ses = sesion();
    if (conBase()) return DG().rpc('generar_documento', { p_op: opId, p_tipo: tipo, p_datos: datos || {} });
    const { op, lados } = await opYLados(opId);
    const lado = lados.indexOf('publicador') > -1 ? 'publicador' : lados.indexOf('plataforma') > -1 ? 'plataforma' : null;
    if (!lado) throw E(T('err_solo_pub', 'Solo quien publica prepara los documentos de la operación.'));
    if (tipo === 'boleto') throw E(T('err_boleto', 'La reserva y el boleto de compra los hace el corredor con el escribano.'));
    if (tipo !== 'reserva' && tipo !== 'contrato') throw E(T('err_tipo', 'Tipo de documento desconocido.'));
    if (op.etapa === 'caida' || op.etapa === 'cerrada') throw E(T('err_cerrada', 'La operación está cerrada.'));
    if (op.tipo === 'venta' || op.linea === 'venta' || op.linea === 'pozo') throw E(T('err_venta', 'En una venta, la reserva y el boleto de compra los hace el corredor con el escribano.'));
    if (!op.interesado_user) throw E(T('err_sin_parte', 'Falta la otra parte de la operación.'));
    const docs = L().docs.get([]);
    if (docs.some(x => x.operacion_id === opId && x.tipo === tipo && x.estado === 'firmado'))
      throw E(tipo === 'reserva' ? T('err_ya_reserva', 'Ya hay una reserva firmada en esta operación.') : T('err_ya_contrato', 'Ya hay un contrato firmado en esta operación.'));
    if (docs.some(x => x.operacion_id === opId && x.tipo === tipo && x.contenido && (x.estado === 'borrador' || x.estado === 'enviado') && !vencido(x)))
      throw E(tipo === 'reserva' ? T('err_curso_reserva', 'Ya hay una reserva sin firmar. Anulala antes de preparar otra.') : T('err_curso_contrato', 'Ya hay un contrato sin firmar. Anulalo antes de preparar otro.'));
    const pub = op.publicador_id ? await S().getPublicador(op.publicador_id).catch(() => null) : null;
    const a = armar({ op, aviso: op.aviso || {}, publicador: pub || { nombre: op.publicador_nombre }, interesado: { nombre: nombreDeMail(op.interesado_email), dni: null }, tipo, datos });
    if (a.cambiosOp) { const ops = DG()._local.ops(); const o = ops.find(x => x.id === opId); Object.assign(o, a.cambiosOp, { actualizada_en: ahoraISO() }); DG()._local.guardarOps(ops); }
    const h = await huella(a.contenido);
    const doc = { id: DG()._local.uid(), operacion_id: opId, tipo, titulo: a.plantilla.titulo, estado: 'enviado', contenido: a.contenido, hash: h,
      plantilla_tipo: a.modelo, plantilla_version: a.plantilla.version, partes: ['publicador', 'interesado'], datos: a.datos, vence_en: a.vence_en,
      creado_por: ses.id, creado_en: ahoraISO(), firmado_en: null, anulado_en: null, motivo_anulacion: null };
    const todos = L().docs.get([]); todos.push(doc); L().docs.set(todos);
    DG()._hitoLocal(opId, 'documento_generado', lado, { documento_id: doc.id, tipo, modelo: a.modelo, version: a.plantilla.version, huella: h.slice(0, 16) });
    if (tipo === 'contrato') DG()._hitoLocal(opId, 'contrato_generado', lado, { documento_id: doc.id });
    return doc.id;
  }

  /* Firmar: cada parte una vez. hashVisto: la huella del texto que se leyó (si no coincide, no se firma) */
  async function firmar(docId, nombre, dni, hashVisto){
    const ses = sesion();
    if (conBase()) return DG().rpc('firmar_documento', { p_doc: docId, p_nombre: nombre, p_dni: dni, p_hash: hashVisto || null });
    const docs = L().docs.get([]); const d = docs.find(x => x.id === docId); if (!d) throw E(T('err_no_doc', 'El documento no existe.'));
    const { op, lados } = await opYLados(d.operacion_id); if (!lados.length) throw E(T('err_no_parte', 'No sos parte de esta operación.'));
    if (!d.contenido || !d.partes) throw E(T('err_no_firmable', 'Este documento no se firma en BAIREN.'));
    if (d.estado === 'anulado') throw E(T('err_anulado', 'El documento fue anulado.'));
    if (d.estado === 'firmado') throw E(T('err_firmado', 'El documento ya está firmado por todas las partes.'));
    if (d.estado !== 'enviado') throw E(T('err_no_listo', 'El documento todavía no está listo para firmar.'));
    if (vencido(d)) throw E(T('err_vencido', 'El documento venció. Pedile a quien publica que prepare uno nuevo.'));
    if (op.etapa === 'caida' || op.etapa === 'cerrada') throw E(T('err_cerrada', 'La operación está cerrada.'));
    const fs = firmasLocal(d.id);
    const lado = d.partes.filter(l => lados.indexOf(l) > -1 && !fs.some(f => f.lado === l)).sort((a, b) => ordenLado(a) - ordenLado(b))[0];
    if (!lado) { if (fs.some(f => lados.indexOf(f.lado) > -1)) throw E(T('err_ya_firmaste', 'Ya firmaste este documento.')); throw E(T('err_no_te_toca', 'Este documento lo firman quien publica y quien busca.')); }
    if ((await huella(d.contenido)) !== d.hash) throw E(T('err_cambio', 'El texto del documento cambió y no se puede firmar. Avisale al equipo BAIREN.'));
    if (hashVisto && String(hashVisto).trim().toLowerCase() !== d.hash) throw E(T('err_cambio_lectura', 'El documento cambió mientras lo leías. Volvé a abrirlo antes de firmar.'));
    if (!(await identidadOkLocal())) throw E(T('err_identidad', 'Para firmar, primero verificá tu identidad en BAIREN.'));
    const n = String(nombre || '').replace(/\s+/g, ' ').trim();
    if (n.length < 5 || n.length > 120 || n.indexOf(' ') < 0) throw E(T('err_nombre', 'Escribí tu nombre y apellido completos.'));
    const dn = dniNorm(dni);
    if (!/^[A-Z0-9]{6,12}$/.test(dn) || !/[0-9]/.test(dn)) throw E(T('err_dni', 'Revisá el DNI: solo los números, sin puntos.'));
    const todas = L().firmas.get([]);
    todas.push({ id: DG()._local.nid(), documento_id: d.id, lado, auth_uid: ses.id, persona_id: null, nombre: n, dni: dn, ip: null,
      user_agent: String(navigator.userAgent || '').slice(0, 400) || null, hash: d.hash, firmado_en: ahoraISO() });
    L().firmas.set(todas);
    const faltan = d.partes.filter(l => !todas.some(f => f.documento_id === d.id && f.lado === l));
    if (!faltan.length) {
      d.estado = 'firmado'; d.firmado_en = ahoraISO(); L().docs.set(docs);
      DG()._hitoLocal(d.operacion_id, 'documento_firmado', lado, { documento_id: d.id, tipo: d.tipo, huella: d.hash.slice(0, 16) });
      if (d.tipo === 'contrato') {
        const ops = DG()._local.ops(); const o = ops.find(x => x.id === d.operacion_id); const x = d.datos || {};
        if (x.monto_total) o.monto_contrato = +x.monto_total; if (/^(USD|ARS)$/.test(x.moneda || '')) o.moneda = x.moneda; if (x.plazo_meses) o.plazo_meses = +x.plazo_meses;
        DG()._local.guardarOps(ops);
        DG()._hitoLocal(d.operacion_id, 'contrato_firmado', lado, { documento_id: d.id, monto_contrato: x.monto_total || null, moneda: x.moneda || null, plazo_meses: x.plazo_meses || null });
      }
    }
    return { estado: faltan.length ? 'enviado' : 'firmado', lado, faltan };
  }

  /* Anular: solo quien publica, antes de que firmen todas las partes */
  async function anular(docId, motivo){
    sesion();
    if (conBase()) return DG().rpc('anular_documento', { p_doc: docId, p_motivo: motivo || null });
    const docs = L().docs.get([]); const d = docs.find(x => x.id === docId); if (!d) throw E(T('err_no_doc', 'El documento no existe.'));
    const { lados } = await opYLados(d.operacion_id);
    if (lados.indexOf('publicador') < 0) throw E(T('err_anular_solo', 'Solo quien publica puede anular el documento.'));
    if (d.estado === 'firmado') throw E(T('err_anular_firmado', 'Ya lo firmaron todas las partes: no se puede anular.'));
    if (d.estado === 'anulado') throw E(T('err_anular_ya', 'El documento ya está anulado.'));
    d.estado = 'anulado'; d.anulado_en = ahoraISO(); d.motivo_anulacion = txt(motivo, 300); L().docs.set(docs);
  }

  const API = { VER, PLANTILLAS, md, huella, huellaCorta, armar, listar, detalle, generar, firmar, anular, estadoDe, rol, elDoc, fechaLarga, diaBA, horaBA, monto };
  window.BPDocumentos = API;

  /* ════════════════ En la operación (mensajes.html) ════════════════ */
  function enchufar(){
    const D = DG(); if (!D || !D.registrarAccion) return;
    if (document.body && document.body.classList.contains('p-mensajes') && !document.querySelector('link[data-dg-documentos]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/documentos.css?v=' + VER; l.setAttribute('data-dg-documentos', ''); document.head.appendChild(l);
    }
    const ICO_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>';
    const docs = d => (d.ext && Array.isArray(d.ext.documentos)) ? d.ext.documentos : [];
    const abierta = d => d.operacion.etapa !== 'caida' && d.operacion.etapa !== 'cerrada';
    const alquiler = d => ['temporario', 'mediano', 'tradicional'].indexOf(d.operacion.linea) > -1;
    const misLados = d => d.lados || [d.lado];
    const meToca = (d, x) => x.firmable && estadoDe(x) === 'enviado' && (x.partes || []).some(l => misLados(d).indexOf(l) > -1 && !(x.firmas || []).some(f => f.lado === l));
    const paraFirmar = d => docs(d).filter(x => meToca(d, x));
    const esperando = d => docs(d).filter(x => x.firmable && estadoDe(x) === 'enviado' && !meToca(d, x) && (x.partes || []).some(l => misLados(d).indexOf(l) > -1));
    const firmadoTipo = (d, tipo) => docs(d).some(x => x.tipo === tipo && x.estado === 'firmado');
    /* Un documento por vez: lo próximo que conviene preparar (o nada si hay uno en curso) */
    const siguiente = d => {
      if (!abierta(d) || !alquiler(d) || docs(d).some(x => x.firmable && estadoDe(x) === 'enviado') || firmadoTipo(d, 'contrato')) return null;
      return (firmadoTipo(d, 'reserva') || D.ordenEtapa(d.operacion.etapa) >= 5) ? 'contrato' : 'reserva';
    };
    const faltaDe = (x, lados) => (x.partes || []).filter(l => !(x.firmas || []).some(f => f.lado === l) && lados.indexOf(l) < 0);

    D.enriquecerDetalle(async d => {
      if (!d || !d.operacion) return;
      let lista = [];
      if (D.conBase()) { if ((d.documentos || []).length) lista = await listar(d.operacion.id); }
      else {
        lista = await listar(d.operacion.id);
        /* La sección "Documentos" de la página lee d.documentos: en modo local se completa acá (con base lo trae la operación) */
        const ya = new Set((d.documentos || []).map(x => x.id));
        d.documentos = (d.documentos || []).concat(lista.filter(x => !ya.has(x.id)).map(x => ({ id: x.id, tipo: x.tipo, titulo: x.titulo, estado: x.estado, creado_en: x.creado_en, firmado_en: x.firmado_en })));
      }
      d.ext.documentos = lista;
    });

    /* El último diálogo abierto (ui.dialogo lo agrega al body) */
    const dialogoAbierto = () => { const vs = document.querySelectorAll('.ms-dlg-velo:not(.sale)'); return vs[vs.length - 1] || null; };
    /* ui.dialogo solo trae fecha con hora: para un día sin hora, el campo pasa a type="date" (calendario del celular) */
    const soloDia = (n, valor) => { const v = dialogoAbierto(); const el = v && v.querySelector('[name="' + n + '"]'); if (el) { el.type = 'date'; el.removeAttribute('min'); el.value = valor; } };

    /* Preparar: dos pasos cortos (las condiciones; lo propio de la reserva o del contrato). El botón Atrás del celular
       vuelve al paso anterior o cierra, como en una app: cada paso suma una entrada al historial con la misma dirección. */
    async function preparar(d, ui, tipo){
      const op = d.operacion, linea = op.linea, porDias = linea === 'temporario';
      const previa = (docs(d).filter(x => x.tipo === 'reserva' && x.estado === 'firmado').pop() || {}).datos || {};
      const ah = new Date();
      const iniDef = previa.fecha_inicio || (ah.getMonth() === 11 ? (ah.getFullYear() + 1) + '-01-01' : ah.getFullYear() + '-' + dos(ah.getMonth() + 2) + '-01');
      const nombre = tipo === 'reserva' ? T('d_reserva', 'Preparar la reserva') : T('d_contrato', 'Preparar el contrato');
      let empujadas = 0, porAtras = false, v1 = null, hecho = false;
      const empujar = () => { try { history.pushState(Object.assign({}, history.state || {}, { dgdPaso: empujadas + 1 }), '', location.href); empujadas++; } catch (e) {} };
      const alVolver = () => { if (empujadas > 0) empujadas--; porAtras = true; const v = dialogoAbierto(); const x = v && v.querySelector('[data-x]'); if (x) x.click(); };
      window.addEventListener('popstate', alVolver);
      const paso1 = () => { const pr = ui.dialogo({
        titulo: nombre + ' · 1 de 2',
        texto: tipo === 'reserva' ? T('d1_reserva_p', 'Las condiciones del alquiler.') : TF('d1_contrato_p', 'Modelo: {l}.', { l: (D.LINEAS[linea] || '').toLowerCase() }),
        ok: T('d_seguir', 'Seguir'),
        campos: [
          { n: 'fecha_inicio', tipo: 'fecha', label: porDias ? T('c_ingreso', 'Ingreso') : T('c_inicio', 'Inicio'), req: true, valor: (v1 && v1.fecha_inicio || iniDef) + 'T12:00' },
          porDias ? { n: 'plazo_dias', tipo: 'numero', label: T('c_plazo_dias', 'Días'), req: true, pos: true, min: 1, max: 92, paso: 1, valor: (v1 && v1.plazo_dias) || previa.plazo_dias || '', ayuda: T('c_plazo_dias_a', 'Hasta 92 días (3 meses).') }
                  : { n: 'plazo_meses', tipo: 'numero', label: T('c_plazo_meses', 'Meses'), req: true, pos: true, min: 1, max: 120, paso: 1, valor: (v1 && v1.plazo_meses) || previa.plazo_meses || op.plazo_meses || (linea === 'tradicional' ? 24 : 6) },
          { fila: [
            { n: 'monto', tipo: 'numero', label: porDias ? T('c_total', 'Precio total') : T('c_mensual', 'Alquiler por mes'), req: true, pos: true, valor: (v1 && v1.monto) || previa.monto || (porDias ? '' : (op.precio_publicado || '')) },
            { n: 'moneda', tipo: 'moneda', label: T('c_moneda', 'Moneda'), req: true, valor: (v1 && v1.moneda) || previa.moneda || op.moneda || 'USD' }
          ] },
          { n: 'deposito', tipo: 'numero', label: T('c_deposito', 'Depósito'), valor: (v1 && v1.deposito) || previa.deposito || '' }
        ]
      }); soloDia('fecha_inicio', (v1 && v1.fecha_inicio) || iniDef); return pr; };
      const paso2 = base => {
        const corta = linea === 'temporario' || (op.tipo === 'mediano' && base.plazo_meses != null && base.plazo_meses <= 3);
        let campos, texto;
        if (tipo === 'reserva') {
          const v = new Date(Date.now() + 3 * 864e5); v.setHours(18, 0, 0, 0);
          texto = T('d2_reserva_p', 'La seña va directo a quien publica.');
          campos = [
            { n: 'sena', tipo: 'numero', label: TF('c_sena', 'Seña ({m})', { m: base.moneda === 'ARS' ? '$' : 'USD' }), req: true, pos: true },
            { n: 'vence', tipo: 'fecha', label: T('c_vence', 'Vence la reserva'), req: true, futuro: true, valor: BP.isoLocal(v), ayuda: T('c_vence_a', 'Si no se firma el contrato, se devuelve la seña.') }
          ];
        } else if (corta) {
          texto = T('d2_corta_p', 'Estadía corta: lleva el registro de la Ley 6255.');
          campos = [
            { n: 'registro', tipo: 'texto', label: T('c_registro', 'Registro (Ley 6255)'), req: true, max: 60 },
            { n: 'servicios', tipo: 'texto', label: T('c_servicios', 'Servicios incluidos'), max: 300, ayuda: T('c_servicios_a', 'Por ejemplo: expensas, internet y limpieza.') },
            { n: 'huespedes', tipo: 'numero', label: T('c_huespedes', 'Huéspedes'), min: 1, max: 20, paso: 1 }
          ];
        } else if (linea === 'tradicional') {
          texto = T('d2_largo_p', 'El ajuste y la garantía los eligen las partes.');
          campos = [
            { n: 'ajuste', tipo: 'texto', label: T('c_ajuste', 'Ajuste del precio'), req: true, max: 300, ayuda: T('c_ajuste_a', 'Índice y cada cuánto. Por ejemplo: IPC cada 6 meses.') },
            { n: 'garantia', tipo: 'texto', label: T('c_garantia', 'Garantía'), max: 300, ayuda: T('c_garantia_a', 'La que ofrezca quien alquila. No se impone ninguna.') }
          ];
        } else {
          texto = T('d2_mediano_p', 'Lo que incluye el precio.');
          campos = [
            { n: 'servicios', tipo: 'texto', label: T('c_servicios', 'Servicios incluidos'), max: 300, ayuda: T('c_servicios_a', 'Por ejemplo: expensas, internet y limpieza.') },
            { n: 'ajuste', tipo: 'texto', label: T('c_ajuste', 'Ajuste del precio'), max: 300, ayuda: T('c_ajuste_fijo', 'Vacío: el precio queda fijo todo el plazo.') }
          ];
        }
        const enviar = async v => {
          const datos = Object.assign({}, base);
          Object.keys(v || {}).forEach(k => { if (v[k] != null && v[k] !== '') datos[k] = v[k]; });
          if (datos.vence) datos.vence = new Date(datos.vence).toISOString();
          await generar(op.id, tipo, datos); hecho = true;
        };
        return ui.dialogo({ titulo: nombre + ' · 2 de 2', texto, ok: tipo === 'reserva' ? T('ok_reserva', 'Preparar reserva') : T('ok_contrato', 'Preparar contrato'), campos, enviar })
          .then(async p2 => { if (p2 && !hecho) await enviar(p2); return p2; });   /* por si el diálogo no corre "enviar" */
      };
      try {
        empujar();
        for (;;) {
          porAtras = false;
          const p1 = await paso1();
          if (!p1) return;
          v1 = { fecha_inicio: String(p1.fecha_inicio).slice(0, 10), monto: p1.monto, moneda: p1.moneda, deposito: p1.deposito };
          if (porDias) v1.plazo_dias = Math.round(p1.plazo_dias); else v1.plazo_meses = Math.round(p1.plazo_meses);
          empujar(); porAtras = false;
          const p2 = await paso2(v1);
          if (p2) break;
          if (!porAtras) return;
        }
      } finally {
        window.removeEventListener('popstate', alVolver);
        if (empujadas > 0) { const n = empujadas; empujadas = 0; try { history.go(-n); } catch (e) {} }
      }
      await ui.recargar();
      ui.toast(T('listo_firma', 'Listo. Falta tu firma.'));
    }

    /* reemplaza: los pasos manuales de mensajes.html que este riel hace con firma ("Contrato preparado" y "Contrato
       firmado"). Hoy mensajes.html no lo lee; el informe trae el cambio para que los oculte y ponga primero los chips de
       los rieles. */
    const REEMPLAZA = ['contrato_gen', 'contrato_firm'];
    /* El chip pasa a principal cuando quien publica ya aceptó la solicitud (antes, lo próximo es responderla) */
    const aceptada = d => (d.hitos || []).some(h => h.tipo === 'solicitud_aceptada') || D.ordenEtapa(d.operacion.etapa) >= 5;
    D.registrarAccion({ id: 'doc_reserva', lados: ['publicador'], reemplaza: REEMPLAZA, texto: () => T('a_reserva', 'Preparar reserva'),
      cuando: d => siguiente(d) === 'reserva', prim: d => aceptada(d),
      ejecutar: (d, ui) => preparar(d, ui, 'reserva') });
    D.registrarAccion({ id: 'doc_contrato', lados: ['publicador'], reemplaza: REEMPLAZA, texto: () => T('a_contrato', 'Preparar contrato'),
      cuando: d => siguiente(d) !== null, prim: d => siguiente(d) === 'contrato',
      ejecutar: (d, ui) => preparar(d, ui, 'contrato') });
    D.registrarAccion({ id: 'doc_firmar', lados: ['interesado', 'publicador'], reemplaza: REEMPLAZA, texto: () => T('a_firmar', 'Revisar y firmar'),
      cuando: d => paraFirmar(d).length > 0, prim: () => true,
      estado: d => { const x = paraFirmar(d)[0]; const otro = (x.firmas || []).length > 0; return x.tipo === 'reserva'
        ? (otro ? T('e_firmar_reserva_2', 'Ya firmó la otra parte. Falta tu firma en la reserva.') : T('e_firmar_reserva', 'Falta tu firma en la reserva.'))
        : (otro ? T('e_firmar_contrato_2', 'Ya firmó la otra parte. Falta tu firma en el contrato.') : T('e_firmar_contrato', 'Falta tu firma en el contrato.')); },
      ejecutar: d => { location.href = 'documento.html?id=' + encodeURIComponent(paraFirmar(d)[0].id); } });
    D.registrarAccion({ id: 'doc_ver', lados: ['interesado', 'publicador'], reemplaza: REEMPLAZA, texto: () => T('a_ver', 'Ver documento'),
      cuando: d => paraFirmar(d).length === 0 && esperando(d).length > 0, prim: () => false,
      estado: d => { const x = esperando(d)[0]; const f = faltaDe(x, misLados(d))[0]; const quien = f ? QUIEN[f]() : T('la_otra_parte', 'la otra parte');
        return x.tipo === 'reserva' ? TF('e_espera_reserva', 'Firmaste la reserva. Falta que la firme {q}.', { q: quien }) : TF('e_espera_contrato', 'Firmaste el contrato. Falta que lo firme {q}.', { q: quien }); },
      ejecutar: d => { location.href = 'documento.html?id=' + encodeURIComponent(esperando(d)[0].id); } });

    /* La sección "Firmas": cada documento en una línea, con su estado */
    const fechaCorta = v => { if (!v) return ''; const s = diaBA(v).split('-'); return +s[2] + '/' + +s[1]; };
    const PILL = { enviado: () => T('p_por_firmar', 'Por firmar'), firmado: () => T('p_firmado', 'Firmado'), anulado: () => T('p_anulado', 'Anulado'), vencido: () => T('p_vencido', 'Vencido'), borrador: () => T('p_borrador', 'Borrador') };
    function linea2(d, x){
      const e = estadoDe(x);
      if (e === 'firmado') return TF('l_firmado', 'Firmado por las dos partes el {f}', { f: fechaCorta(x.firmado_en) });
      if (e === 'anulado') return TF('l_anulado', 'Anulado el {f}', { f: fechaCorta(x.anulado_en) });
      if (e === 'vencido') return TF('l_vencido', 'Venció el {f}', { f: fechaCorta(x.vence_en) });
      const ya = (x.firmas || []).map(f => f.lado), faltan = (x.partes || []).filter(l => ya.indexOf(l) < 0);
      const mio = l => misLados(d).indexOf(l) > -1;
      if (!ya.length) return T('l_nadie', 'Faltan las dos firmas');
      if (ya.some(mio)) return TF('l_firmaste', 'Firmaste · falta {q}', { q: faltan.map(l => QUIEN[l]()).join(' y ') });
      if (faltan.some(mio)) return TF('l_falta_tuya', 'Firmó {q} · falta tu firma', { q: QUIEN[ya[0]]() });
      return TF('l_una', 'Firmó {a} · falta {b}', { a: QUIEN[ya[0]](), b: faltan.map(l => QUIEN[l]()).join(' y ') });
    }
    D.registrarSeccion({
      id: 'firmas', titulo: () => T('s_titulo', 'Firmas'),
      cuando: d => docs(d).some(x => x.firmable) || (alquiler(d) && abierta(d) && d.lado !== 'plataforma'),
      cuenta: d => docs(d).filter(x => x.firmable).length,
      html: d => {
        const xs = docs(d).filter(x => x.firmable);
        const pie = `<p class="ms-nota dgd-confianza">${esc(T('confianza_corta', 'Firma con registro de fecha, IP y huella del documento (Ley 25.506).'))}</p>`;
        if (!xs.length) return `<div class="ms-docs-vacio">${ICO_DOC}<p>${esc(d.lado === 'publicador' ? T('vacio_pub', 'Prepará la reserva o el contrato: cada parte lo firma acá.') : T('vacio_int', 'Acá vas a firmar la reserva y el contrato.'))}</p></div>` + pie;
        const orden = xs.slice().reverse();
        const fila = x => `<li>${ICO_DOC}<span class="ms-doc-n"><a class="dgd-a" href="documento.html?id=${esc(encodeURIComponent(x.id))}">${esc(x.titulo || x.tipo)}</a><small>${esc(linea2(d, x))}</small></span><span class="ms-pill ms-pill-${esc(estadoDe(x) === 'enviado' ? 'pendiente' : estadoDe(x))}">${esc((PILL[estadoDe(x)] || (() => x.estado))())}</span></li>`;
        const vis = orden.slice(0, 3), resto = orden.slice(3);
        return `<ul class="ms-docs dgd-lista">${vis.map(fila).join('')}</ul>`
          + (resto.length ? `<details class="dgd-mas"><summary>${esc(TF('ver_n', 'Ver los {n}', { n: orden.length }))}</summary><ul class="ms-docs dgd-lista">${resto.map(fila).join('')}</ul></details>` : '') + pie;
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enchufar); else enchufar();
})();
