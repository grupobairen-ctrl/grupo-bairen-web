/* BAIREN · Portal · diccionario de la interfaz en portugués e inglés.
   El HTML está en castellano; ui.js (BP.i18n) aplica estas claves sobre los
   elementos con data-i18n / data-i18n-html / data-i18n-ph / data-i18n-aria según
   localStorage('bairen_lang'), el mismo selector ES / PT / EN de la web.
   Cubre la portada, el header, el menú de celular y el pie. Las descripciones
   de cada aviso ya vienen traducidas en los datos (descripcion_en / _pt).
   Voz: par a par, sin mayúsculas sostenidas, sin exclamaciones. */
window.BP_I18N = {
  en: {
    /* header, menú, pie */
    skip: 'Skip to content', menu: 'Menu', idioma: 'Language',
    publicar: 'List a property', ingresar: 'Sign in', notificaciones: 'Notifications', mis_contactos: 'My contacts', favoritos: 'Favorites',
    comprar: 'Buy', alquilar: 'Rent', mediano: 'Mid-term', largo: 'Long-term', emprendimientos: 'Developments', publicadores: 'Listers',
    ft_tag: 'Selected properties portal in Buenos Aires.',
    ft_legend: 'BAIREN selects and lists properties and provides the tools to manage them. Each listing is the responsibility of whoever publishes it.',
    ft_nav: 'Navigation', ft_zonas: 'Areas', ft_mas: 'More', ft_indice: 'BAIREN Index', ft_criterios: 'Selection criteria', ft_terminos: 'Terms and privacy',
    ft_uso: 'Terms of use', ft_priv: 'Privacy policy',
    /* portada */
    hero_h1a: 'Selected properties', hero_h1b: 'in Buenos Aires.', hero_sub: 'Live Buenos Aires at its finest.',
    ph_zona: 'Neighborhood, building or area', buscar_aria: 'Search properties', ver_props: 'See properties',
    est_eyebrow: 'BAIREN Selection', est_h2: 'We follow a standard.', est_copy: 'Before listing each property, we check:', criterios: 'How we select',
    hito_ubicacion: 'Location', hito_estado: 'Condition', hito_distribucion: 'Layout', hito_calidad: 'Build quality',
    edif_h2: 'First-rate buildings and complexes.', edif_copy: 'Today they have their place on BAIREN.',
    ver_unidades: 'See units', avisarme: 'Notify me', fachada_de: 'Facade of', publica_mas: 'List your property or development',
    edif_ant: 'Previous building', edif_sig: 'Next building', edif_riel: 'Buildings, swipe to see more',
    pub_h2: 'Does your property fit BAIREN?',
    pub_copy: 'We review the property. It goes live if it meets the requirements. From <em>OS</em> you manage it and follow it up.',
    pub_btn: 'List a property',
    idx_eyebrow: 'BAIREN Index', idx_h2: 'What is a m² worth?', idx_fecha: 'USD per m² for sale. Average asking price, September 2026.', idx_mas: 'See properties for sale',
    psi_eyebrow: 'PSI · Personal Property Shopper', psi_h2: 'Looking to invest in property?', psi_copy: 'Together we acquire your next best investment in Buenos Aires.', psi_btn: 'Discover PSI'
  },
  pt: {
    skip: 'Ir para o conteúdo', menu: 'Menu', idioma: 'Idioma',
    publicar: 'Publicar', ingresar: 'Entrar', notificaciones: 'Notificações', mis_contactos: 'Meus contatos', favoritos: 'Favoritos',
    comprar: 'Comprar', alquilar: 'Alugar', mediano: 'Médio prazo', largo: 'Longo prazo', emprendimientos: 'Empreendimentos', publicadores: 'Anunciantes',
    ft_tag: 'Portal de imóveis selecionados em Buenos Aires.',
    ft_legend: 'A BAIREN seleciona e publica imóveis e oferece a gestão para administrá-los. Cada anúncio é responsabilidade de quem o publica.',
    ft_nav: 'Navegação', ft_zonas: 'Zonas', ft_mas: 'Mais', ft_indice: 'Índice BAIREN', ft_criterios: 'Critérios de seleção', ft_terminos: 'Termos e privacidade',
    ft_uso: 'Termos de uso', ft_priv: 'Política de privacidade',
    hero_h1a: 'Imóveis selecionados', hero_h1b: 'em Buenos Aires.', hero_sub: 'Viva Buenos Aires no seu melhor.',
    ph_zona: 'Bairro, edifício ou zona', buscar_aria: 'Buscar imóveis', ver_props: 'Ver imóveis',
    est_eyebrow: 'Seleção BAIREN', est_h2: 'Seguimos um padrão.', est_copy: 'Antes de incorporar cada imóvel, verificamos:', criterios: 'Como selecionamos',
    hito_ubicacion: 'Localização', hito_estado: 'Estado', hito_distribucion: 'Distribuição', hito_calidad: 'Qualidade construtiva',
    edif_h2: 'Edifícios e complexos de primeira linha.', edif_copy: 'Hoje encontram seu espaço na BAIREN.',
    ver_unidades: 'Ver unidades', avisarme: 'Avise-me', fachada_de: 'Fachada do', publica_mas: 'Publique seu imóvel ou empreendimento',
    edif_ant: 'Edifício anterior', edif_sig: 'Próximo edifício', edif_riel: 'Edifícios, deslize para ver mais',
    pub_h2: 'Seu imóvel se encaixa na BAIREN?',
    pub_copy: 'Revisamos o imóvel. Ele entra no portal se cumprir os requisitos. Pelo <em>OS</em> você o gerencia e acompanha.',
    pub_btn: 'Publicar imóvel',
    idx_eyebrow: 'Índice BAIREN', idx_h2: 'Quanto vale o m²?', idx_fecha: 'USD por m² à venda. Média de anúncio, setembro de 2026.', idx_mas: 'Ver imóveis à venda',
    psi_eyebrow: 'PSI · Personal Shopper Imobiliário', psi_h2: 'Pensando em investir em um imóvel?', psi_copy: 'Adquirimos juntos o seu próximo melhor investimento em Buenos Aires.', psi_btn: 'Conhecer o PSI'
  }
};
