/* Íconos de amenities copiados de propiedad.html de bairengroup.com (líneas 481-511), sin cambios */
(function(){
const SVG = {
  pileta:    '<path d="M2 18c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M5 14V6a2 2 0 014 0v8M15 14V6a2 2 0 014 0v8M5 10h14"/>',
  gym:       '<path d="M6 5v14M18 5v14M3 9v6M21 9v6M6 12h12"/>',
  spa:       '<path d="M12 22V12M7 8c0 2.5 5 4 5 4s5-1.5 5-4-3-5-5-2c-2-3-5-1-5 2zM12 12c-2 0-5 1.5-5 4 0 1 1 2 2.5 2S12 16 12 16M12 12c2 0 5 1.5 5 4 0 1-1 2-2.5 2S12 16 12 16"/>',
  sum:       '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6"/>',
  cochera:   '<path d="M3 13l2-6h14l2 6M3 13v6h3v-2h12v2h3v-6M3 13h18M6 16h2M16 16h2"/>',
  ascensor:  '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 8l3-3 3 3M9 16l3 3 3-3"/>',
  ac:        '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
  terraza:   '<path d="M3 21h18M5 21V10M19 21V10M5 10l7-5 7 5M8 14h2M14 14h2"/>',
  parrilla:  '<path d="M5 9h14l-1 6a3 3 0 01-3 3H9a3 3 0 01-3-3L5 9zM8 9V6M12 9V5M16 9V6M12 18v3"/>',
  laundry:   '<rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="12" cy="13" r="4"/><circle cx="8" cy="6" r=".5" fill="currentColor"/><circle cx="11" cy="6" r=".5" fill="currentColor"/>',
  seguridad: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3zM9 12l2 2 4-4"/>',
  conserje:  '<path d="M3 21h18M5 21V7h14v14M9 11h2M13 11h2M9 15h2M13 15h2M11 21v-4h2v4"/>',
  bici:      '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-7h5l3 7M10 10l-1-4h2M14 10l4-2"/>',
  pet:       '<circle cx="5" cy="10" r="1.5"/><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="19" cy="10" r="1.5"/><path d="M12 12c-3 0-5 3-5 5s2 3 3 2.5 2-1 2-1 1 .5 2 1 3-.5 3-2.5-2-5-5-5z"/>',
  calefaccion:'<path d="M12 3v18M8 8c0 2 4 2 4 4s-4 2-4 4M16 8c0 2-4 2-4 4s4 2 4 4"/>',
  baulera:   '<path d="M3 7h18v14H3zM3 7l3-4h12l3 4M9 14h6"/>',
  amoblado:  '<path d="M3 18v-6a3 3 0 013-3h12a3 3 0 013 3v6M3 18v3M21 18v3M5 12V8M19 12V8"/>',
  check:     '<polyline points="4 12 9 17 20 6"/>',
  star:      '<path d="M12 2l3 7 7 .8-5 5 2 7-7-4-7 4 2-7-5-5 7-.8z"/>'
};
function svgIcon(d, size) {
  return `<svg viewBox="0 0 24 24" width="${size||20}" height="${size||20}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
const AMENITY_ICONS = {
  'Pileta':SVG.pileta,'Gimnasio':SVG.gym,'Spa / Sauna':SVG.spa,'SUM':SVG.sum,'Cochera':SVG.cochera,
  'Ascensor':SVG.ascensor,'Aire acond.':SVG.ac,'Jardín / Terraza':SVG.terraza,'Parrilla':SVG.parrilla,
  'Laundry':SVG.laundry,'Seguridad 24hs':SVG.seguridad,'Conserje 24hs':SVG.conserje,'Bicicletero':SVG.bici,
  'Pet friendly':SVG.pet,'Calefacción central':SVG.calefaccion,'Baulera':SVG.baulera,'Amoblado':SVG.amoblado,
  'All in':SVG.check,
};
window.BAIREN_AMENITY_ICONS = AMENITY_ICONS; window.bairenSvgIcon = svgIcon; window.BAIREN_SVG = SVG;
})();
