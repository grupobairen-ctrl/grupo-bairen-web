/* i18n compartido de BAIREN — banderas ES / PT / EN.
   El HTML está en español por default; este script traduce a PT/EN según la
   bandera elegida y recuerda el idioma en localStorage('bairen_lang').
   Solo alquiler a mediano plazo (22/09/2026): sin claves de Comprar ni PSI. */
(function () {
  const T = {
    pt: {
      // Nav
      nav_alquilar: "Alugar", nav_contacto: "Contato",
      // Footer
      ft_tag: "Apartamentos mobiliados de médio prazo em Buenos Aires. Tudo incluído, sem garantia nem seguro fiança.",
      ft_ops: "Operações", ft_alquilar: "Alugar",
      ft_contacto: "Contato", ft_dev: "Desenvolvido por",
      ft_copy: "© 2026 Grupo Bairen. Todos os direitos reservados.",
      // Catálogo (aluguel)
      cat_back: "← Início", cat_barrios: "Bairros",
      cat_p_todos: "Preço: todos", cat_p_1: "Até USD 1.000", cat_p_2: "USD 1.000 a 1.500", cat_p_3: "USD 1.500 a 2.500", cat_p_4: "USD 2.500 ou mais",
      cat_a_todos: "Ambientes: todos", cat_a_1: "1 ambiente", cat_a_2: "2 ambientes", cat_a_3: "3 ambientes", cat_a_4: "4 ou mais",
      chip_cochera: "Garagem", chip_pileta: "Piscina", chip_pet: "Aceita pets",
      cat_search_ph: "Buscar endereço ou bairro…",
      cat_barrio_head: "Selecione um bairro", cat_barrio_clear: "Limpar filtro",
      mapa_title: "Escolha um bairro", mapa_hint: "Escolha um bairro no mapa para ver as unidades", mapa_ver_cat: "Ver no catálogo →", mapa_todos: "Todos os bairros",
      cat_sort_default: "Ordem padrão", cat_sort_pasc: "Preço: do menor ao maior",
      cat_sort_pdesc: "Preço: do maior ao menor", cat_sort_m2: "Maior área",
      cat_copy: "© 2026 Grupo Bairen · Todos os direitos reservados",
      // Propiedad
      prop_nav_props: "Imóveis", prop_nav_why: "Por que BAIREN", prop_nav_contact: "Contato",
      prop_back: "← Catálogo", prop_back_full: "← Voltar ao catálogo",
      prop_loading: "Carregando imóvel...",
      prop_price_m: "Preço mensal",
      prop_price_v: "Valor",
      prop_secl_unidad: "A unidade", prop_secl_ubic: "Localização",
      prop_ac_footer: "Consulta sem custo · Resposta em menos de 2 h",
      prop_nf_h: "Imóvel não encontrado",
      prop_nf_p: "O link pode ter mudado, a unidade já foi alugada ou o endereço está incorreto."
    },
    en: {
      // Nav
      nav_alquilar: "Rent", nav_contacto: "Contact",
      // Footer
      ft_tag: "Furnished medium-term apartments in Buenos Aires. All inclusive, no guarantor and no surety bond.",
      ft_ops: "Services", ft_alquilar: "Rent",
      ft_contacto: "Contact", ft_dev: "Developed by",
      ft_copy: "© 2026 Grupo Bairen. All rights reserved.",
      // Catalogue (rentals)
      cat_back: "← Home", cat_barrios: "Neighbourhoods",
      cat_p_todos: "Price: all", cat_p_1: "Up to USD 1,000", cat_p_2: "USD 1,000 to 1,500", cat_p_3: "USD 1,500 to 2,500", cat_p_4: "USD 2,500+",
      cat_a_todos: "Rooms: all", cat_a_1: "1 room", cat_a_2: "2 rooms", cat_a_3: "3 rooms", cat_a_4: "4 or more",
      chip_cochera: "Parking", chip_pileta: "Pool", chip_pet: "Pet friendly",
      cat_search_ph: "Search address or neighbourhood…",
      cat_barrio_head: "Select a neighbourhood", cat_barrio_clear: "Clear filter",
      mapa_title: "Choose a neighbourhood", mapa_hint: "Pick a neighbourhood on the map to see its units", mapa_ver_cat: "See in the catalogue →", mapa_todos: "All neighbourhoods",
      cat_sort_default: "Default order", cat_sort_pasc: "Price: low to high",
      cat_sort_pdesc: "Price: high to low", cat_sort_m2: "Largest area",
      cat_copy: "© 2026 Grupo Bairen · All rights reserved",
      // Propiedad
      prop_nav_props: "Properties", prop_nav_why: "Why BAIREN", prop_nav_contact: "Contact",
      prop_back: "← Catalogue", prop_back_full: "← Back to catalogue",
      prop_loading: "Loading property...",
      prop_price_m: "Monthly price",
      prop_price_v: "Price",
      prop_secl_unidad: "The unit", prop_secl_ubic: "Location",
      prop_ac_footer: "Free inquiry · Reply within 2 hours",
      prop_nf_h: "Property not found",
      prop_nf_p: "The link may have changed, the unit may already be rented, or the address is incorrect."
    }
  };


  const nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach(n => { n.dataset.es = n.textContent; });
  const phs = document.querySelectorAll('[data-i18n-ph]');
  phs.forEach(n => { n.dataset.esPh = n.getAttribute('placeholder') || ''; });

  function apply(lang) {
    window.BAIREN_LANG = lang;
    const dict = (lang !== 'es' && T[lang]) ? T[lang] : null;
    nodes.forEach(n => {
      const k = n.getAttribute('data-i18n');
      n.textContent = (dict && dict[k] != null) ? dict[k] : n.dataset.es;
    });
    phs.forEach(n => {
      const k = n.getAttribute('data-i18n-ph');
      n.setAttribute('placeholder', (dict && dict[k] != null) ? dict[k] : n.dataset.esPh);
    });
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en' : 'es-AR';
    document.querySelectorAll('.flag').forEach(f => f.classList.toggle('active', f.dataset.lang === lang));
    try { localStorage.setItem('bairen_lang', lang); } catch (e) {}
    document.dispatchEvent(new Event('bairen:lang'));
  }

  document.querySelectorAll('.flag').forEach(f =>
    f.addEventListener('click', () => apply(f.dataset.lang))
  );

  let saved = 'es';
  try { saved = localStorage.getItem('bairen_lang') || 'es'; } catch (e) {}
  apply(saved);
})();

/* ── Miniaturas al vuelo (Supabase Image Transformations) ──
   Convierte una URL pública de storage en su versión redimensionada.
   Los navegadores modernos reciben WebP automáticamente. */
window.sbImg = function (u, w) {
  if (!u || u.indexOf('/storage/v1/object/public/') === -1) return u;
  return u.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w + '&quality=75';
};
