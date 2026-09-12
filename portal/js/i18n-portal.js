/* BAIREN · Portal · diccionario de la interfaz en portugués e inglés.
   El HTML está en castellano; ui.js (BP.i18n) aplica estas claves sobre los
   elementos con data-i18n / data-i18n-html / data-i18n-ph / data-i18n-aria según
   localStorage('bairen_lang'), el mismo selector ES / PT / EN de la web.
   Cubre la portada, el header, el menú de celular, el pie, el catálogo, la ficha
   y las tarjetas. Las descripciones de cada aviso ya vienen traducidas en los
   datos (descripcion_en / _pt). Lo que se arma desde JS usa BP.t(clave, castellano)
   y BP.tf(clave, castellano, { variables }) con {marcadores}.
   Prefijos: ui_ (compartido en ui.js), card_ (tarjetas de data.js), cat_ (catálogo),
   ficha_ (ficha), op_ (operaciones), ui_dato_ (etiquetas fijas de datos: cualidades,
   amenities, características, plazos e insignias, por su slug).
   El registro producto (panel, publicar, curación, ingresar) queda en castellano.
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
    pub_copy: 'We review the property. It goes live if it meets the requirements. From <a href="https://os.bairengroup.com" class="h-link-os">Bairen OS</a> you manage it and follow it up.',
    pub_btn: 'List a property',
    idx_eyebrow: 'BAIREN Index', idx_h2: 'What is a m² worth?', idx_fecha: 'USD per m² for sale. Average asking price, September 2026.', idx_mas: 'See properties for sale',
    psi_eyebrow: 'PSI · Personal Property Shopper', psi_h2: 'Looking to invest in property?', psi_copy: 'Together we acquire your next best investment in Buenos Aires.', psi_btn: 'Discover PSI',

    /* interfaz compartida (ui.js): fechas, precios, error, compartir, avisos */
    ui_pub_hoy: 'Listed today', ui_pub_ayer: 'Listed yesterday', ui_pub_dias: 'Listed {n} days ago', ui_pub_mes: 'Listed 1 month ago', ui_pub_meses: 'Listed {n} months ago',
    ui_consultar: 'Price on request', ui_por_mes: '/mo',
    ui_error_default: 'We could not load the information.', ui_error_ayuda: 'It may be your connection or something on our side. Try again in a moment.', ui_reintentar: 'Retry',
    ui_compartir_aria: 'Share this property', ui_compartir: 'Share', ui_por_mail: 'By email', ui_copiar: 'Copy the link', ui_otras_apps: 'Other apps', ui_cerrar: 'Close', ui_copiado: 'Copied', ui_enlace_copiado: 'Link copied.',
    ui_ingresa_notif: 'Sign in to see your notifications.', ui_sin_notif: 'No new notifications.', ui_sesion_cerrada: 'Signed out.',
    ui_sin_unidades: 'no units', ui_una_sug: 'One suggestion', ui_sugs: '{n} suggestions', ui_nav_principal: 'Main', ui_logo_aria: 'BAIREN, home',
    ui_leyenda_plataforma: 'BAIREN is a property portal and does not act as a real estate broker. Each property is listed by its owner, by a licensed broker or by the developer, who are responsible for the transaction.',
    ui_leyenda_alq_intro: 'Legal notice, Buenos Aires rental law:',
    /* operaciones: etiqueta del menú y complemento del título ("departamentos en venta") */
    op_venta_label: 'Buy', op_venta_h: 'for sale', op_alquiler_label: 'Rent', op_alquiler_h: 'for rent', op_mediano_label: 'Rent · mid-term', op_mediano_h: 'for mid-term rent', op_largo_label: 'Rent · long-term', op_largo_h: 'for long-term rent',
    /* etiquetas fijas de datos, por slug: cualidades verificadas */
    ui_dato_luminoso: 'Bright', ui_dato_silencioso: 'Quiet', ui_dato_terraza_propia: 'Private terrace', ui_dato_balcon: 'Balcony', ui_dato_vista_abierta: 'Open view', ui_dato_piso_alto: 'High floor', ui_dato_apto_home_office: 'Home office ready', ui_dato_acepta_mascotas: 'Pets allowed', ui_dato_reciclado_a_nuevo: 'Fully renovated', ui_dato_edificio_con_amenities: 'Building with amenities', ui_dato_cochera: 'Parking space', ui_dato_calefaccion_central: 'Central heating',
    /* amenities y características */
    ui_dato_pileta: 'Pool', ui_dato_gimnasio: 'Gym', ui_dato_sum: 'Multipurpose room', ui_dato_parrilla: 'Barbecue', ui_dato_seguridad_24hs: '24h security', ui_dato_terraza_o_jardin: 'Terrace or garden', ui_dato_jardin_terraza: 'Garden / terrace', ui_dato_ascensor: 'Elevator', ui_dato_laundry: 'Laundry', ui_dato_pet_friendly: 'Pet friendly', ui_dato_aire_acondicionado: 'Air conditioning', ui_dato_aire_acond: 'Air conditioning', ui_dato_baulera: 'Storage room', ui_dato_conserje_24hs: '24h concierge', ui_dato_bicicletero: 'Bike storage', ui_dato_spa_sauna: 'Spa / sauna', ui_dato_amoblado: 'Furnished', ui_dato_sin_amoblar: 'Unfurnished', ui_dato_amoblado_y_equipado: 'Furnished and equipped', ui_dato_pileta_climatizada: 'Heated pool', ui_dato_seguridad: 'Security',
    ui_dato_apto_credito: 'Mortgage eligible', ui_dato_apto_profesional: 'Professional use allowed', ui_dato_ofrece_financiacion: 'Financing available', ui_dato_permite_mascotas: 'Pets allowed', ui_dato_acepta_seguro_de_caucion: 'Accepts surety insurance', ui_dato_contrato_digital: 'Digital contract', ui_dato_sin_garantia_propietaria: 'No guarantor required', ui_dato_entrega_diciembre_2027: 'Delivery December 2027',
    /* plazos, tipos e insignias */
    ui_dato_3_12_meses: '3 to 12 months', ui_dato_a_partir_de_2_anos: 'From 2 years',
    ui_dato_departamento: 'Apartment', ui_dato_piso: 'Full-floor apartment', ui_dato_casa: 'House',
    ui_dato_dueno_verificado: 'Verified owner', ui_dato_dueno_directo: 'Direct owner', ui_dato_corredor_inmobiliario_matriculado: 'Licensed real estate broker', ui_dato_venta_directa: 'Direct sale',

    /* tarjetas (data.js) */
    card_venta: 'Sale', card_alq_mediano: 'Mid-term rental', card_alq_largo: 'Long-term rental',
    card_reservada: 'Reserved', card_seleccionada: 'Selected', card_ejemplo: 'Sample', card_consultar_precio: 'Price on request', card_expensas: 'building fees',
    card_monoamb: 'Studio', card_amb: 'rooms', card_dorm_1: 'bed', card_dorm_n: 'beds', card_bano: 'bath', card_banos: 'baths', card_coch_1: 'parking space', card_coch_n: 'parking spaces',
    card_ver: 'View {t}', card_ver_en: 'View {t} in {b}', card_publica: 'Listed by', card_wa_aria: 'Message {p} on WhatsApp', card_contacto_pendiente: 'Contact pending', card_contactar: 'Contact',
    card_fav: 'Save to favorites', card_fav_on: 'Saved to favorites', card_fav_off: 'Removed from favorites', card_ver_ficha: 'View listing', card_fotos_prod: 'Photos coming soon',
    card_wa_msg: 'Hi, I saw {t} ({c}) on BAIREN and would like more information.',

    /* catálogo (buscar.html): banda, filtros, orden, panel de más filtros */
    cat_title: 'Properties in Buenos Aires', cat_sub: 'Every property passes the BAIREN filter before it goes live. Contact goes straight to the lister.',
    cat_map_hint: 'Tap a neighborhood to filter. The number is what is listed today.', cat_map_aria: 'Neighborhood map',
    cat_q_ph: 'Neighborhood, street or feature', cat_q_aria: 'Location or feature', cat_op_aria: 'Operation', cat_todas: 'All',
    cat_plazo_aria: 'Rental term', cat_plazo_todos: 'Any term',
    cat_tipo_aria: 'Property type', cat_tipo_depto: 'Apartment', cat_tipo_piso: 'Full-floor', cat_tipo_casa: 'House', cat_tipo_todos: 'All types',
    cat_amb_dorm: 'Rooms | Beds', cat_amb_min: 'Rooms, minimum', cat_dorm_min: 'Bedrooms, minimum', cat_any: 'Any', cat_limpiar: 'Clear', cat_aplicar: 'Apply',
    cat_precio: 'Price', cat_usd_rango: 'USD, from and to', cat_min_ph: 'Minimum', cat_max_ph: 'Maximum', cat_pmin_aria: 'Minimum price in USD', cat_pmax_aria: 'Maximum price in USD',
    cat_barrios: 'Neighborhoods', cat_filtros: 'Filters', cat_mas_filtros: 'More filters',
    cat_crear_alerta: 'Create alert', cat_alerta_creada: 'Alert created', cat_alerta_quitar: 'Alert created, tap to remove it',
    cat_ordenar: 'Sort by', cat_sort_relevancia: 'Most relevant', cat_sort_precio_asc: 'Lowest price', cat_sort_precio_desc: 'Highest price', cat_sort_recientes: 'Newest', cat_sort_m2: 'Largest area',
    cat_pager_aria: 'Result pages', cat_crumbs_aria: 'Breadcrumb', cat_cerrar: 'Close',
    cat_drawer_note: 'Refine your search.', cat_expmax: 'Maximum building fees, ARS per month', cat_expmax_ph: 'No maximum',
    cat_banos_min: 'Bathrooms, minimum', cat_coch_min: 'Parking spaces, minimum', cat_m2: 'Total area, m²', cat_desde_ph: 'From', cat_hasta_ph: 'To', cat_m2min_aria: 'Minimum area in m²', cat_m2max_aria: 'Maximum area in m²',
    cat_antig: 'Age of the building', cat_antig_any: 'Any', cat_antig_0: 'Brand new', cat_antig_5: 'Up to 5 years', cat_antig_20: 'Up to 20 years', cat_antig_50: 'Up to 50 years',
    cat_cual_t: 'Qualities verified by BAIREN', cat_cual_note: 'Checked by BAIREN in the unit itself.', cat_amen_t: 'Amenities and features', cat_pub_t: 'Listing',
    cat_incl_res: 'Include reserved', cat_amoblado: 'Furnished', cat_dueno: 'Owners only', cat_video: 'With video', cat_hace: 'Listed within', cat_hace_any: 'any date', cat_hace_hoy: 'today', cat_hace_7: '7 days', cat_hace_30: '30 days',
    cat_limpiar_todo: 'Clear all', cat_ver_resultados: 'See results',
    /* catálogo: lo que se arma en JS (título, contador, vacío, alerta, paginación) */
    cat_t_propiedades: 'Properties', cat_t_deptos: 'Apartments', cat_t_pisos: 'Full-floor apartments', cat_t_ph: 'PH', cat_t_casas: 'Houses', cat_t_guardadas: 'saved', cat_t_venta_alq: 'for sale and rent', cat_t_en: 'in', cat_t_ba: 'in Buenos Aires',
    cat_t_propiedad_1: 'Property', cat_t_depto_1: 'Apartment', cat_t_piso_1: 'Full-floor apartment', cat_t_ph_1: 'PH', cat_t_casa_1: 'House', cat_t_guardada_1: 'saved',
    cat_n_1: '1 property', cat_n: '{n} properties', cat_anun_0: 'No results with these filters', cat_anun_1: 'One property',
    cat_vacio_favs: 'No saved properties yet', cat_vacio_favs_txt: 'Tap the heart on any listing and it will show up here.',
    cat_vacio_emp: 'No developments listed yet', cat_vacio_emp_txt: 'Developments have their own page: <a href="emprendimientos.html" style="text-decoration:underline">see developments</a>. If you are a developer, <a href="publicar.html#desarrolladora" style="text-decoration:underline">list yours</a>.',
    cat_vacio: 'No units like this yet',
    cat_sug_intro: 'Few units make it in here: each one has to meet a standard of building, condition and presentation. ',
    cat_sug_hoy: 'Today{donde} there are ', cat_sug_y: ' and ', cat_sug_unidad: 'unit', cat_sug_unidades: 'units',
    cat_sug_probar: 'Try another neighborhood or remove a filter.',
    cat_sug_res_1: ' There is also 1 reserved unit, which you can include from More filters.', cat_sug_res_n: ' There are also {n} reserved units, which you can include from More filters.',
    cat_sug_publicar: ' Have a property like this? <a href="publicar.html" style="text-decoration:underline">List it</a>.',
    cat_pag_ant: 'Previous page', cat_pag_sig: 'Next page', cat_pag: 'Page {n}',
    cat_leyenda_alq: 'Legal notice, Buenos Aires rental law (Law 2340, art. 10 par. 8), for residential rental listings published by licensed brokers: ',
    cat_crumb_todas: 'All operations', cat_mapa_nd: 'Map not available.',
    cat_amb_btn: '{n}+ rooms', cat_dorm_btn: '{n}+ beds', cat_precio_btn: 'USD {a} to {b}', cat_sin_max: 'no maximum',
    cat_quitar: 'Remove {z}', cat_err_max: 'The maximum has to be higher than the minimum.', cat_err_carga: 'We could not load the properties.',
    cat_toast_alerta_quitada: 'Alert removed.', cat_toast_alerta_mail: 'Alert saved. We will email you when a property like this comes in.', cat_toast_alerta_local: 'Alert saved in this browser. With an account, it reaches you by email.',
    cat_unidad: ' unit', cat_unidades: ' units',

    /* ficha (propiedad.html): hero, galería, la unidad */
    ficha_reservada: 'Reserved', ficha_estado: 'Status', ficha_precio: 'Price', ficha_precio_mensual: 'Monthly rent', ficha_no_consultas: 'not taking enquiries', ficha_por_mes: 'per month', ficha_todo_incluido: 'per month · all inclusive', ficha_mas_expensas: 'plus $ {n} building fees',
    ficha_foto_1: '1 photo', ficha_fotos: '{n} photos', ficha_video: 'Video', ficha_fotos_prod: 'Photos coming soon', ficha_foto_de: '{t}, photo {i} of {n}', ficha_ver_foto: 'View photo {i}', ficha_foto_alt: '{t}, photo {i}', ficha_lb_de: '{i} of {n}', ficha_lb_fotos_de: 'Photos of {t}', ficha_foto_n: 'Photo {i} of {n}',
    ficha_lb_cerrar: 'Close the photos', ficha_lb_cerrar_txt: 'Close', ficha_lb_prev: 'Previous photo', ficha_lb_next: 'Next photo',
    ficha_monoamb: 'studio', ficha_ambientes: '{n} rooms', ficha_en: 'in',
    ficha_reservada_msg: 'This property is reserved and is not taking enquiries for now.', ficha_ver_disponibles: 'See what is available in {z}',
    ficha_verificada_title: 'Verified by BAIREN', ficha_aviso_ejemplo: 'Sample listing',
    ficha_la_unidad: 'The unit', ficha_totales: 'total', ficha_cubiertos: 'covered', ficha_amb_1: 'room', ficha_amb_n: 'rooms', ficha_dorm_1: 'bedroom', ficha_dorm_n: 'bedrooms', ficha_bano_1: 'bathroom', ficha_bano_n: 'bathrooms', ficha_coch_1: 'parking space', ficha_coch_n: 'parking spaces', ficha_a_estrenar: 'Brand new', ficha_ano_1: '1 year', ficha_anos: '{n} years', ficha_antiguedad: 'age',
    ficha_video_t: 'Video tour', ficha_video_de: 'Video of {t}', ficha_desc_prod: 'Description coming soon.', ficha_leer_mas: 'Read more', ficha_leer_menos: 'Read less',
    ficha_detalle: 'The unit in detail', ficha_plazo_tile: 'Term {p}', ficha_ver_caract: 'See all {n} features', ficha_ver_menos: 'Show less',
    ficha_ubicacion: 'Location', ficha_mapa_title: 'Map of the property location', ficha_ubic_aprox: 'Approximate location. The exact address is confirmed by the lister.',
    /* ficha: preguntas, quién publica, reporte, legal */
    ficha_preguntale: 'Ask the lister', ficha_elegi: 'Pick one or write your own. It goes straight to {p}.', ficha_q1: 'Is it still available?', ficha_q2: 'How much are the building fees?', ficha_q3: 'Which floor is it on?', ficha_q4: 'When can I visit?', ficha_q_ph: 'Write your question', ficha_q_aria: 'Your question', ficha_enviar: 'Send',
    ficha_quien_publica: 'Listed by', ficha_dueno_verif: 'Direct owner, title verified by BAIREN', ficha_ficha_verif: 'Listing verified by BAIREN', ficha_pub_ejemplo: 'Sample lister', ficha_responde: 'The transaction is handled by {r}, {m}.', ficha_ver_todas: 'See all their properties', ficha_desde: 'Listing on BAIREN since {y}',
    ficha_reportar: 'Report a problem with this listing', ficha_rep_vendida: 'It is sold or reserved', ficha_rep_contacto: 'I cannot reach the lister', ficha_rep_otro: 'Other reason', ficha_fraudes: 'How to avoid fraud', ficha_rep_ok: 'Sent, thank you', ficha_rep_toast: 'Thank you. We review the listing within 24 hours.',
    ficha_vista_1: '1 view', ficha_vistas: '{n} views', ficha_legal: 'Legal information',
    /* ficha: tarjeta de contacto y formulario */
    ficha_lbl_venta: 'Sale price', ficha_lbl_mensual: 'Monthly rent',
    ficha_direccion: 'Address', ficha_barrio: 'Neighborhood', ficha_superficie: 'Area', ficha_ambientes_lbl: 'Rooms', ficha_monoamb_val: 'Studio', ficha_plazo_lbl: 'Term', ficha_exp_serv: 'Fees and utilities', ficha_todos_incl: 'All included', ficha_expensas: 'Building fees', ficha_exp_val: '$ {n} per month', ficha_disponible: 'Available',
    ficha_publica: 'Listed by', ficha_dueno_v: 'Verified owner', ficha_venta_directa: 'Direct sale', ficha_corredor_resp: 'Responsible broker: {r}, {m}',
    ficha_cual_1: 'One quality verified by BAIREN', ficha_cual_n: '{n} qualities verified by BAIREN', ficha_revisada: 'Listing reviewed by BAIREN before going live',
    ficha_res_box: 'Reserved: not taking enquiries for now. If it frees up, it will be listed here again.', ficha_sin_contacto: 'Contact pending: {p} has not added a WhatsApp or email yet. BAIREN does not take part in the transaction, so the only valid contact is the lister.',
    ficha_coordinar: 'Book a visit', ficha_consultar: 'Send an enquiry', ficha_ver_tel: 'Show phone', ficha_avisar_baja: 'Notify me if the price drops', ficha_alerta_creada: 'Alert created', ficha_toast_baja: 'We will let you know if the price drops. With an account, by email.',
    ficha_fav: 'Save to favorites', ficha_compartir: 'Share', ficha_foot_bairen: 'Your enquiry goes to BAIREN', ficha_foot_directo: 'Direct contact with the lister · BAIREN does not take part in the transaction',
    ficha_escribile: 'Message {p}', ficha_nombre: 'Name', ficha_mail: 'Email', ficha_tel: 'Phone with country and area code', ficha_mensaje: 'Message', ficha_quiero_visita: 'I would like to book a visit', ficha_dia_hora: 'Day and time that suit you. {p} will confirm.',
    ficha_acepto: 'I accept the <a href="legales.html#terminos">Terms</a> and the <a href="legales.html#privacidad">Privacy policy</a>, and that my details are sent to {p}{resp}.', ficha_acepto_resp: ', responsible for the transaction', ficha_enviar_consulta: 'Send enquiry', ficha_enviando: 'Sending…',
    ficha_ok_t: 'Enquiry sent', ficha_ok_p: 'It goes straight to {p}, who will reply by email or WhatsApp.', ficha_ok_mail: ' If your email client did not open, write to <a href="mailto:{e}">{e}</a>.', ficha_seguir_wa: 'Continue on WhatsApp', ficha_otra: 'Send another enquiry',
    ficha_err_nombre: 'Tell us your name.', ficha_err_mail: 'Check the email, for example name@domain.com.', ficha_err_tel: 'Phone with area code, for example 11 5555 6666.', ficha_err_fecha: 'Pick a day and time.', ficha_err_acepto: 'To send the enquiry you need to accept the terms.', ficha_toast_enviada: 'Your enquiry goes straight to {p}.', ficha_toast_elegi: 'Pick a question or write your own.',
    ficha_mail_subject: 'Enquiry about {t} ({c}) from BAIREN', ficha_mail_visita: 'I would like to visit on {d}.', ficha_tel_copiado: 'Phone number copied.',
    /* ficha: similares, pie, errores */
    ficha_similares: 'Similar properties', ficha_ver_mas_en: 'See more in {z}', ficha_sin_similares: 'No similar units yet.', ficha_contactar: 'Contact', ficha_en_bairen: '{t} on BAIREN',
    ficha_no_encontrada: 'We could not find that property', ficha_no_encontrada_p: 'It may no longer be listed. <a href="buscar.html" style="text-decoration:underline">Back to properties</a>.', ficha_no_encontrada_title: 'Property not found · BAIREN', ficha_err_carga: 'We could not load this property.',

    /* header con sesión y perfil (ui.js, BP.applySession): el desplegable "Mi cuenta", el popover de Publicar y las tres etiquetas del perfil */
    mi_cuenta: 'My account', mis_avisos: 'My listings', mis_propiedades: 'My properties', importar_cartera: 'Import portfolio', interesados: 'Enquiries', alertas: 'Searches and alerts', curacion: 'Curation', cerrar_sesion: 'Sign out',
    quien_publica: 'Who is listing?', busco_propiedad: 'I am looking for a property', soy_dueno_directo: 'I am the owner', soy_profesional: 'Agency, broker or developer', bairen_os: 'Bairen OS',
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
    pub_copy: 'Revisamos o imóvel. Ele entra no portal se cumprir os requisitos. Pelo <a href="https://os.bairengroup.com" class="h-link-os">Bairen OS</a> você o gerencia e acompanha.',
    pub_btn: 'Publicar imóvel',
    idx_eyebrow: 'Índice BAIREN', idx_h2: 'Quanto vale o m²?', idx_fecha: 'USD por m² à venda. Média de anúncio, setembro de 2026.', idx_mas: 'Ver imóveis à venda',
    psi_eyebrow: 'PSI · Personal Shopper Imobiliário', psi_h2: 'Pensando em investir em um imóvel?', psi_copy: 'Adquirimos juntos o seu próximo melhor investimento em Buenos Aires.', psi_btn: 'Conhecer o PSI',

    /* interfaz compartida (ui.js): fechas, precios, error, compartir, avisos */
    ui_pub_hoy: 'Publicado hoje', ui_pub_ayer: 'Publicado ontem', ui_pub_dias: 'Publicado há {n} dias', ui_pub_mes: 'Publicado há 1 mês', ui_pub_meses: 'Publicado há {n} meses',
    ui_consultar: 'Preço sob consulta', ui_por_mes: '/mês',
    ui_error_default: 'Não conseguimos carregar as informações.', ui_error_ayuda: 'Pode ser a sua conexão ou algo do nosso lado. Tente de novo em instantes.', ui_reintentar: 'Tentar de novo',
    ui_compartir_aria: 'Compartilhar este imóvel', ui_compartir: 'Compartilhar', ui_por_mail: 'Por e-mail', ui_copiar: 'Copiar o link', ui_otras_apps: 'Outros aplicativos', ui_cerrar: 'Fechar', ui_copiado: 'Copiado', ui_enlace_copiado: 'Link copiado.',
    ui_ingresa_notif: 'Entre para ver suas notificações.', ui_sin_notif: 'Você não tem notificações novas.', ui_sesion_cerrada: 'Sessão encerrada.',
    ui_sin_unidades: 'sem unidades', ui_una_sug: 'Uma sugestão', ui_sugs: '{n} sugestões', ui_nav_principal: 'Principal', ui_logo_aria: 'BAIREN, início',
    ui_leyenda_plataforma: 'A BAIREN é um portal de imóveis e não exerce a corretagem imobiliária. Cada imóvel é publicado pelo seu proprietário, por um corretor habilitado ou pela incorporadora, responsáveis pela operação.',
    ui_leyenda_alq_intro: 'Aviso legal, lei de aluguéis de Buenos Aires:',
    /* operaciones */
    op_venta_label: 'Comprar', op_venta_h: 'à venda', op_alquiler_label: 'Alugar', op_alquiler_h: 'para alugar', op_mediano_label: 'Alugar · médio prazo', op_mediano_h: 'para aluguel de médio prazo', op_largo_label: 'Alugar · longo prazo', op_largo_h: 'para aluguel de longo prazo',
    /* etiquetas fijas de datos, por slug: cualidades verificadas */
    ui_dato_luminoso: 'Iluminado', ui_dato_silencioso: 'Silencioso', ui_dato_terraza_propia: 'Terraço privativo', ui_dato_balcon: 'Sacada', ui_dato_vista_abierta: 'Vista livre', ui_dato_piso_alto: 'Andar alto', ui_dato_apto_home_office: 'Pronto para home office', ui_dato_acepta_mascotas: 'Aceita pets', ui_dato_reciclado_a_nuevo: 'Totalmente reformado', ui_dato_edificio_con_amenities: 'Prédio com áreas de lazer', ui_dato_cochera: 'Vaga de garagem', ui_dato_calefaccion_central: 'Aquecimento central',
    /* amenities y características */
    ui_dato_pileta: 'Piscina', ui_dato_gimnasio: 'Academia', ui_dato_sum: 'Salão de festas', ui_dato_parrilla: 'Churrasqueira', ui_dato_seguridad_24hs: 'Segurança 24h', ui_dato_terraza_o_jardin: 'Terraço ou jardim', ui_dato_jardin_terraza: 'Jardim / terraço', ui_dato_ascensor: 'Elevador', ui_dato_laundry: 'Lavanderia', ui_dato_pet_friendly: 'Pet friendly', ui_dato_aire_acondicionado: 'Ar-condicionado', ui_dato_aire_acond: 'Ar-condicionado', ui_dato_baulera: 'Depósito', ui_dato_conserje_24hs: 'Portaria 24h', ui_dato_bicicletero: 'Bicicletário', ui_dato_spa_sauna: 'Spa / sauna', ui_dato_amoblado: 'Mobiliado', ui_dato_sin_amoblar: 'Sem mobília', ui_dato_amoblado_y_equipado: 'Mobiliado e equipado', ui_dato_pileta_climatizada: 'Piscina aquecida', ui_dato_seguridad: 'Segurança',
    ui_dato_apto_credito: 'Aceita financiamento', ui_dato_apto_profesional: 'Permite uso profissional', ui_dato_ofrece_financiacion: 'Oferece financiamento', ui_dato_permite_mascotas: 'Aceita pets', ui_dato_acepta_seguro_de_caucion: 'Aceita seguro-fiança', ui_dato_contrato_digital: 'Contrato digital', ui_dato_sin_garantia_propietaria: 'Sem fiador', ui_dato_entrega_diciembre_2027: 'Entrega em dezembro de 2027',
    /* plazos, tipos e insignias */
    ui_dato_3_12_meses: '3 a 12 meses', ui_dato_a_partir_de_2_anos: 'A partir de 2 anos',
    ui_dato_departamento: 'Apartamento', ui_dato_piso: 'Andar inteiro', ui_dato_casa: 'Casa',
    ui_dato_dueno_verificado: 'Proprietário verificado', ui_dato_dueno_directo: 'Proprietário direto', ui_dato_corredor_inmobiliario_matriculado: 'Corretor de imóveis habilitado', ui_dato_venta_directa: 'Venda direta',

    /* tarjetas (data.js) */
    card_venta: 'Venda', card_alq_mediano: 'Aluguel de médio prazo', card_alq_largo: 'Aluguel de longo prazo',
    card_reservada: 'Reservado', card_seleccionada: 'Selecionado', card_ejemplo: 'Exemplo', card_consultar_precio: 'Preço sob consulta', card_expensas: 'de condomínio',
    card_monoamb: 'Studio', card_amb: 'amb.', card_dorm_1: 'dorm.', card_dorm_n: 'dorm.', card_bano: 'banheiro', card_banos: 'banheiros', card_coch_1: 'vaga', card_coch_n: 'vagas',
    card_ver: 'Ver {t}', card_ver_en: 'Ver {t} em {b}', card_publica: 'Publicado por', card_wa_aria: 'Escrever para {p} pelo WhatsApp', card_contacto_pendiente: 'Contato pendente', card_contactar: 'Contatar',
    card_fav: 'Salvar nos favoritos', card_fav_on: 'Salvo nos favoritos', card_fav_off: 'Removido dos favoritos', card_ver_ficha: 'Ver anúncio', card_fotos_prod: 'Fotos em produção',
    card_wa_msg: 'Olá, vi {t} ({c}) na BAIREN e quero mais informações.',

    /* catálogo (buscar.html): banda, filtros, orden, panel de más filtros */
    cat_title: 'Imóveis em Buenos Aires', cat_sub: 'Cada imóvel passa pelo filtro da BAIREN antes de entrar. O contato vai direto para quem publica.',
    cat_map_hint: 'Toque em um bairro para filtrar. O número é o que está publicado hoje.', cat_map_aria: 'Mapa de bairros',
    cat_q_ph: 'Bairro, rua ou característica', cat_q_aria: 'Localização ou característica', cat_op_aria: 'Operação', cat_todas: 'Todas',
    cat_plazo_aria: 'Prazo do aluguel', cat_plazo_todos: 'Todos',
    cat_tipo_aria: 'Tipo de imóvel', cat_tipo_depto: 'Apartamento', cat_tipo_piso: 'Andar inteiro', cat_tipo_casa: 'Casa', cat_tipo_todos: 'Todos os tipos',
    cat_amb_dorm: 'Amb | Dorm', cat_amb_min: 'Ambientes, mínimo', cat_dorm_min: 'Dormitórios, mínimo', cat_any: 'Todos', cat_limpiar: 'Limpar', cat_aplicar: 'Aplicar',
    cat_precio: 'Preço', cat_usd_rango: 'USD, de e até', cat_min_ph: 'Mínimo', cat_max_ph: 'Máximo', cat_pmin_aria: 'Preço mínimo em USD', cat_pmax_aria: 'Preço máximo em USD',
    cat_barrios: 'Bairros', cat_filtros: 'Filtros', cat_mas_filtros: 'Mais filtros',
    cat_crear_alerta: 'Criar alerta', cat_alerta_creada: 'Alerta criado', cat_alerta_quitar: 'Alerta criado, toque para removê-lo',
    cat_ordenar: 'Ordenar', cat_sort_relevancia: 'Mais relevantes', cat_sort_precio_asc: 'Menor preço', cat_sort_precio_desc: 'Maior preço', cat_sort_recientes: 'Mais recentes', cat_sort_m2: 'Maior área',
    cat_pager_aria: 'Páginas de resultados', cat_crumbs_aria: 'Trilha de navegação', cat_cerrar: 'Fechar',
    cat_drawer_note: 'Refine a busca.', cat_expmax: 'Condomínio máximo, pesos por mês', cat_expmax_ph: 'Sem máximo',
    cat_banos_min: 'Banheiros, mínimo', cat_coch_min: 'Vagas, mínimo', cat_m2: 'Área total, m²', cat_desde_ph: 'De', cat_hasta_ph: 'Até', cat_m2min_aria: 'Área mínima em m²', cat_m2max_aria: 'Área máxima em m²',
    cat_antig: 'Idade do imóvel', cat_antig_any: 'Qualquer', cat_antig_0: 'Novo', cat_antig_5: 'Até 5 anos', cat_antig_20: 'Até 20 anos', cat_antig_50: 'Até 50 anos',
    cat_cual_t: 'Qualidades verificadas pela BAIREN', cat_cual_note: 'Conferidas pela BAIREN na própria unidade.', cat_amen_t: 'Áreas de lazer e características', cat_pub_t: 'Anúncio',
    cat_incl_res: 'Incluir reservados', cat_amoblado: 'Mobiliado', cat_dueno: 'Só proprietários', cat_video: 'Com vídeo', cat_hace: 'Publicado há', cat_hace_any: 'qualquer data', cat_hace_hoy: 'hoje', cat_hace_7: '7 dias', cat_hace_30: '30 dias',
    cat_limpiar_todo: 'Limpar tudo', cat_ver_resultados: 'Ver resultados',
    /* catálogo: lo que se arma en JS */
    cat_t_propiedades: 'Imóveis', cat_t_deptos: 'Apartamentos', cat_t_pisos: 'Andares inteiros', cat_t_ph: 'PH', cat_t_casas: 'Casas', cat_t_guardadas: 'salvos', cat_t_venta_alq: 'à venda e para alugar', cat_t_en: 'em', cat_t_ba: 'em Buenos Aires',
    cat_t_propiedad_1: 'Imóvel', cat_t_depto_1: 'Apartamento', cat_t_piso_1: 'Andar inteiro', cat_t_ph_1: 'PH', cat_t_casa_1: 'Casa', cat_t_guardada_1: 'salvo',
    cat_n_1: '1 imóvel', cat_n: '{n} imóveis', cat_anun_0: 'Sem resultados com esses filtros', cat_anun_1: 'Um imóvel',
    cat_vacio_favs: 'Você ainda não salvou imóveis', cat_vacio_favs_txt: 'Toque no coração em qualquer anúncio e ele vai aparecer aqui.',
    cat_vacio_emp: 'Ainda não há empreendimentos publicados', cat_vacio_emp_txt: 'Os empreendimentos têm página própria: <a href="emprendimientos.html" style="text-decoration:underline">ver empreendimentos</a>. Se você é incorporadora, <a href="publicar.html#desarrolladora" style="text-decoration:underline">publique o seu</a>.',
    cat_vacio: 'Ainda não há unidades assim',
    cat_sug_intro: 'Aqui entram poucas unidades: cada uma passa por um padrão de prédio, estado e apresentação. ',
    cat_sug_hoy: 'Hoje{donde} há ', cat_sug_y: ' e ', cat_sug_unidad: 'unidade', cat_sug_unidades: 'unidades',
    cat_sug_probar: 'Tente outro bairro ou tire um filtro.',
    cat_sug_res_1: ' Também há 1 reservada, que você pode incluir em Mais filtros.', cat_sug_res_n: ' Também há {n} reservadas, que você pode incluir em Mais filtros.',
    cat_sug_publicar: ' Tem um imóvel assim? <a href="publicar.html" style="text-decoration:underline">Publique</a>.',
    cat_pag_ant: 'Página anterior', cat_pag_sig: 'Próxima página', cat_pag: 'Página {n}',
    cat_leyenda_alq: 'Aviso legal, lei de aluguéis de Buenos Aires (Lei 2340, art. 10 inc. 8), para anúncios de aluguel residencial publicados por corretores habilitados: ',
    cat_crumb_todas: 'Todas as operações', cat_mapa_nd: 'Mapa indisponível.',
    cat_amb_btn: '{n}+ amb.', cat_dorm_btn: '{n}+ dorm.', cat_precio_btn: 'USD {a} a {b}', cat_sin_max: 'sem máximo',
    cat_quitar: 'Remover {z}', cat_err_max: 'O máximo tem que ser maior que o mínimo.', cat_err_carga: 'Não conseguimos carregar os imóveis.',
    cat_toast_alerta_quitada: 'Alerta removido.', cat_toast_alerta_mail: 'Alerta salvo. Avisamos por e-mail quando entrar um imóvel assim.', cat_toast_alerta_local: 'Alerta salvo neste navegador. Com a sua conta, chega por e-mail.',
    cat_unidad: ' unidade', cat_unidades: ' unidades',

    /* ficha (propiedad.html): hero, galería, la unidad */
    ficha_reservada: 'Reservado', ficha_estado: 'Situação', ficha_precio: 'Preço', ficha_precio_mensual: 'Aluguel mensal', ficha_no_consultas: 'não recebe consultas', ficha_por_mes: 'por mês', ficha_todo_incluido: 'por mês · tudo incluído', ficha_mas_expensas: 'mais $ {n} de condomínio',
    ficha_foto_1: '1 foto', ficha_fotos: '{n} fotos', ficha_video: 'Vídeo', ficha_fotos_prod: 'Fotos em produção', ficha_foto_de: '{t}, foto {i} de {n}', ficha_ver_foto: 'Ver foto {i}', ficha_foto_alt: '{t}, foto {i}', ficha_lb_de: '{i} de {n}', ficha_lb_fotos_de: 'Fotos de {t}', ficha_foto_n: 'Foto {i} de {n}',
    ficha_lb_cerrar: 'Fechar as fotos', ficha_lb_cerrar_txt: 'Fechar', ficha_lb_prev: 'Foto anterior', ficha_lb_next: 'Próxima foto',
    ficha_monoamb: 'studio', ficha_ambientes: '{n} ambientes', ficha_en: 'em',
    ficha_reservada_msg: 'Este imóvel está reservado e por enquanto não recebe consultas.', ficha_ver_disponibles: 'Ver os disponíveis em {z}',
    ficha_verificada_title: 'Verificada pela BAIREN', ficha_aviso_ejemplo: 'Anúncio de exemplo',
    ficha_la_unidad: 'A unidade', ficha_totales: 'totais', ficha_cubiertos: 'cobertos', ficha_amb_1: 'ambiente', ficha_amb_n: 'ambientes', ficha_dorm_1: 'dormitório', ficha_dorm_n: 'dormitórios', ficha_bano_1: 'banheiro', ficha_bano_n: 'banheiros', ficha_coch_1: 'vaga', ficha_coch_n: 'vagas', ficha_a_estrenar: 'Novo', ficha_ano_1: '1 ano', ficha_anos: '{n} anos', ficha_antiguedad: 'idade',
    ficha_video_t: 'Tour em vídeo', ficha_video_de: 'Vídeo de {t}', ficha_desc_prod: 'Descrição em produção.', ficha_leer_mas: 'Ler mais', ficha_leer_menos: 'Ler menos',
    ficha_detalle: 'A unidade em detalhe', ficha_plazo_tile: 'Prazo {p}', ficha_ver_caract: 'Ver as {n} características', ficha_ver_menos: 'Ver menos',
    ficha_ubicacion: 'Localização', ficha_mapa_title: 'Mapa da localização do imóvel', ficha_ubic_aprox: 'Localização aproximada. O endereço exato é confirmado por quem publica.',
    /* ficha: preguntas, quién publica, reporte, legal */
    ficha_preguntale: 'Pergunte a quem publica', ficha_elegi: 'Escolha uma ou escreva a sua. Chega direto para {p}.', ficha_q1: 'Ainda está disponível?', ficha_q2: 'Qual é o valor do condomínio?', ficha_q3: 'Em que andar fica?', ficha_q4: 'Quando posso visitar?', ficha_q_ph: 'Escreva sua pergunta', ficha_q_aria: 'Sua pergunta', ficha_enviar: 'Enviar',
    ficha_quien_publica: 'Quem publica', ficha_dueno_verif: 'Proprietário direto, titularidade verificada pela BAIREN', ficha_ficha_verif: 'Anúncio verificado pela BAIREN', ficha_pub_ejemplo: 'Anunciante de exemplo', ficha_responde: 'Pela operação responde {r}, {m}.', ficha_ver_todas: 'Ver todos os seus imóveis', ficha_desde: 'Publica na BAIREN desde {y}',
    ficha_reportar: 'Reportar um problema com este anúncio', ficha_rep_vendida: 'Está vendido ou reservado', ficha_rep_contacto: 'Não consigo contato', ficha_rep_otro: 'Outro motivo', ficha_fraudes: 'Como evitar fraudes', ficha_rep_ok: 'Enviado, obrigado', ficha_rep_toast: 'Obrigado. Revisamos o anúncio em menos de 24 horas.',
    ficha_vista_1: '1 visualização', ficha_vistas: '{n} visualizações', ficha_legal: 'Informações legais',
    /* ficha: tarjeta de contacto y formulario */
    ficha_lbl_venta: 'Preço de venda', ficha_lbl_mensual: 'Aluguel mensal',
    ficha_direccion: 'Endereço', ficha_barrio: 'Bairro', ficha_superficie: 'Área', ficha_ambientes_lbl: 'Ambientes', ficha_monoamb_val: 'Studio', ficha_plazo_lbl: 'Prazo', ficha_exp_serv: 'Condomínio e serviços', ficha_todos_incl: 'Tudo incluído', ficha_expensas: 'Condomínio', ficha_exp_val: '$ {n} por mês', ficha_disponible: 'Disponível',
    ficha_publica: 'Publicado por', ficha_dueno_v: 'Proprietário verificado', ficha_venta_directa: 'Venda direta', ficha_corredor_resp: 'Corretor responsável: {r}, {m}',
    ficha_cual_1: 'Uma qualidade verificada pela BAIREN', ficha_cual_n: '{n} qualidades verificadas pela BAIREN', ficha_revisada: 'Anúncio revisado pela BAIREN antes de publicar',
    ficha_res_box: 'Reservado: por enquanto não recebe consultas. Se for liberado, volta a ser publicado aqui.', ficha_sin_contacto: 'Contato pendente: {p} ainda não cadastrou WhatsApp nem e-mail. A BAIREN não participa da operação, então o único contato válido é o de quem publica.',
    ficha_coordinar: 'Agendar visita', ficha_consultar: 'Consultar', ficha_ver_tel: 'Ver telefone', ficha_avisar_baja: 'Avise-me se o preço baixar', ficha_alerta_creada: 'Alerta criado', ficha_toast_baja: 'Avisamos se o preço baixar. Com a sua conta, por e-mail.',
    ficha_fav: 'Salvar nos favoritos', ficha_compartir: 'Compartilhar', ficha_foot_bairen: 'Sua consulta chega à BAIREN', ficha_foot_directo: 'Contato direto com quem publica · a BAIREN não participa da operação',
    ficha_escribile: 'Escreva para {p}', ficha_nombre: 'Nome', ficha_mail: 'E-mail', ficha_tel: 'Telefone com código do país e da área', ficha_mensaje: 'Mensagem', ficha_quiero_visita: 'Quero agendar uma visita', ficha_dia_hora: 'Dia e hora que ficam bons para você. {p} confirma.',
    ficha_acepto: 'Aceito os <a href="legales.html#terminos">Termos</a> e a <a href="legales.html#privacidad">Política de privacidade</a>, e que meus dados sejam enviados a {p}{resp}.', ficha_acepto_resp: ', responsável pela operação', ficha_enviar_consulta: 'Enviar consulta', ficha_enviando: 'Enviando…',
    ficha_ok_t: 'Consulta enviada', ficha_ok_p: 'Chega direto para {p}, que responde por e-mail ou WhatsApp.', ficha_ok_mail: ' Se o seu e-mail não abriu, escreva para <a href="mailto:{e}">{e}</a>.', ficha_seguir_wa: 'Continuar pelo WhatsApp', ficha_otra: 'Enviar outra consulta',
    ficha_err_nombre: 'Diga seu nome.', ficha_err_mail: 'Confira o e-mail, por exemplo nome@dominio.com.', ficha_err_tel: 'Telefone com código de área, por exemplo 11 5555 6666.', ficha_err_fecha: 'Escolha dia e hora.', ficha_err_acepto: 'Para enviar a consulta é preciso aceitar os termos.', ficha_toast_enviada: 'Sua consulta vai direto para {p}.', ficha_toast_elegi: 'Escolha uma pergunta ou escreva a sua.',
    ficha_mail_subject: 'Consulta sobre {t} ({c}) pela BAIREN', ficha_mail_visita: 'Quero visitar em {d}.', ficha_tel_copiado: 'Telefone copiado.',
    /* ficha: similares, pie, errores */
    ficha_similares: 'Imóveis semelhantes', ficha_ver_mas_en: 'Ver mais em {z}', ficha_sin_similares: 'Ainda não há unidades semelhantes.', ficha_contactar: 'Contatar', ficha_en_bairen: '{t} na BAIREN',
    ficha_no_encontrada: 'Não encontramos esse imóvel', ficha_no_encontrada_p: 'Pode ser que não esteja mais publicado. <a href="buscar.html" style="text-decoration:underline">Voltar aos imóveis</a>.', ficha_no_encontrada_title: 'Imóvel não encontrado · BAIREN', ficha_err_carga: 'Não conseguimos carregar este imóvel.',

    /* header con sesión y perfil (ui.js, BP.applySession): el desplegable "Mi cuenta", el popover de Publicar y las tres etiquetas del perfil */
    mi_cuenta: 'Minha conta', mis_avisos: 'Meus anúncios', mis_propiedades: 'Meus imóveis', importar_cartera: 'Importar carteira', interesados: 'Interessados', alertas: 'Buscas e alertas', curacion: 'Curadoria', cerrar_sesion: 'Sair',
    quien_publica: 'Quem publica?', busco_propiedad: 'Procuro imóvel', soy_dueno_directo: 'Sou proprietário direto', soy_profesional: 'Imobiliária, corretor ou incorporadora', bairen_os: 'Bairen OS',
  }
};
