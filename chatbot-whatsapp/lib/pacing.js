'use strict';

/**
 * Ritmo humano para WhatsApp: parte la respuesta del cerebro en varios mensajes
 * (como manda una persona), con las fotos como mensajes de imagen aparte, y calcula
 * cuánto mostrar "escribiendo…" según el largo. Subí RITMO.escala para algo más lento.
 */

const RITMO = {
  escala: Number(process.env.RITMO_ESCALA || 1),
  lecturaMin: 1200, lecturaPorChar: 18, lecturaMax: 4500, // pausa antes de empezar a escribir
  tipeoBase: 900,   tipeoPorChar: 45,   tipeoMax: 9000,   // "escribiendo…" por mensaje de texto
  pausaEntre: 1100,                                       // gap entre un mensaje y el siguiente
  imagen: 1500,                                           // "demora" al mandar una foto
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const IMG_RE = /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i;

const tLectura = (len) =>
  clamp(RITMO.lecturaMin + len * RITMO.lecturaPorChar, RITMO.lecturaMin, RITMO.lecturaMax) * RITMO.escala;
const tTipeo = (s) =>
  clamp(RITMO.tipeoBase + s.length * RITMO.tipeoPorChar, RITMO.tipeoBase, RITMO.tipeoMax) * RITMO.escala;
const tPausa = () => RITMO.pausaEntre * RITMO.escala;

/**
 * Convierte el texto del cerebro en una lista de "mensajes":
 *   { type: 'text', value }   o   { type: 'image', value: url }
 * Las URLs de imagen salen como mensajes de foto aparte (máximo 4).
 */
function partir(text) {
  const out = [];
  let fotos = 0;
  for (const block of text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
    const txtLines = [];
    for (const line of block.split('\n').map((l) => l.trim())) {
      if (IMG_RE.test(line)) {
        if (txtLines.length) { out.push({ type: 'text', value: txtLines.join('\n') }); txtLines.length = 0; }
        if (fotos < 4) { out.push({ type: 'image', value: line }); fotos++; }
      } else if (line) {
        txtLines.push(line);
      }
    }
    if (txtLines.length) out.push({ type: 'text', value: txtLines.join('\n') });
  }
  return out.length ? out : [{ type: 'text', value: text }];
}

module.exports = { partir, tLectura, tTipeo, tPausa, imagenDelay: () => RITMO.imagen * RITMO.escala };
