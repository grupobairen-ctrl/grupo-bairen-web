/**
 * Zonas del portal en el servidor: copia de la tabla de mapa-barrios.js (raíz del
 * repo) para que las alertas de búsqueda filtren igual que el catálogo. Si se
 * agrega una zona o un alias allá, se agrega acá.
 *   zonaDe('Palermo Soho') → 'Palermo';  zonaDe('San Isidro') → 'GBA Norte'
 * ZONAS_PORTAL es BP.ZONAS (portal/js/ui.js): el nicho. Lo que cae fuera no se
 * publica en el catálogo, así que tampoco se manda por mail.
 */
const ZONAS = [
  { key: 'Núñez', svg: ['Nuñez'], alias: ['nunez'] },
  { key: 'Saavedra', svg: ['Saavedra'] },
  { key: 'Belgrano', svg: ['Belgrano'], alias: ['belgrano c', 'belgrano r', 'bajo belgrano', 'belgrano chico'] },
  { key: 'Colegiales', svg: ['Colegiales'] },
  { key: 'Palermo', svg: ['Palermo'], alias: ['palermo soho', 'palermo hollywood', 'las canitas', 'canitas', 'palermo chico', 'palermo viejo', 'palermo nuevo', 'palermo botanico', 'botanico'] },
  { key: 'Recoleta', svg: ['Recoleta'], alias: ['barrio norte'] },
  { key: 'Retiro', svg: ['Retiro'] },
  { key: 'Puerto Madero', svg: ['Puerto Madero'] },
  { key: 'Centro', svg: ['San Nicolas', 'Monserrat'], alias: ['microcentro', 'san nicolas', 'monserrat', 'montserrat', 'tribunales'] },
  { key: 'San Telmo', svg: ['San Telmo'] },
  { key: 'Villa Crespo', svg: ['Villa Crespo'] },
  { key: 'Chacarita', svg: ['Chacarita'] },
  { key: 'Almagro', svg: ['Almagro'] },
  { key: 'Balvanera', svg: ['Balvanera'], alias: ['once', 'congreso'] },
  { key: 'Caballito', svg: ['Caballito'] },
  { key: 'Villa Urquiza', svg: ['Villa Urquiza'] },
  { key: 'GBA Norte', svg: [], alias: ['san isidro', 'vicente lopez', 'olivos', 'martinez', 'acassuso', 'la lucila', 'beccar', 'san fernando', 'tigre', 'nordelta'] },
];
const ZONAS_PORTAL = ['Palermo', 'Recoleta', 'Retiro', 'Belgrano', 'Núñez', 'Colegiales', 'Villa Crespo', 'Puerto Madero', 'Saavedra', 'GBA Norte'];

const norm = s => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ALIAS = {};
ZONAS.forEach(z => { ALIAS[norm(z.key)] = z.key; (z.svg || []).forEach(s => { ALIAS[norm(s)] = z.key; }); (z.alias || []).forEach(a => { ALIAS[norm(a)] = z.key; }); });

/* barrio (texto libre) → zona canónica, o null si no se conoce. */
function zonaDe(barrio) { const n = norm(barrio); if (!n) return null; return ALIAS[n] || null; }

module.exports = { zonaDe, ZONAS_PORTAL, norm };
