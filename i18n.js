/* i18n compartido de BAIREN — banderas ES / PT / EN.
   El HTML está en español por default; este script traduce a PT/EN según la
   bandera elegida y recuerda el idioma en localStorage('bairen_lang').
   También ajusta: el link de descarga del PDF (por idioma) y cualquier
   link de WhatsApp marcado con data-wa (mensaje pre-escrito por idioma). */
(function () {
  const T = {
    pt: {
      // Nav
      nav_comprar: "Comprar", nav_alquilar: "Alugar", nav_contacto: "Contato",
      nav_cta_info: "Solicitar informação", nav_cta_rep: "Comprar representado",
      // Footer
      ft_tag: "Apartamentos premium em Buenos Aires. Comprar, vender e alugar.",
      ft_ops: "Operações", ft_comprar: "Comprar", ft_alquilar: "Alugar",
      ft_contacto: "Contato", ft_dev: "Desenvolvido por",
      ft_copy: "© 2026 Grupo Bairen. Todos os direitos reservados.",
      // Personal Shopper
      ps_h1: "Comprar em Buenos Aires",
      ps_not1: "Sem buscar", ps_not2: "Sem visitar", ps_not3: "Sem negociar",
      ps_sub1: "Cuidamos", ps_sub_em: "de tudo",
      ps_lead1: "Você nos diz qual apartamento quer. Nós o revisamos, negociamos e",
      ps_lead_b: "compramos por você.",
      ps_pdf: "Conheça mais sobre nosso serviço",
      ps_cta: "Solicitar informação", ps_video_eye: "O serviço, em um minuto",
      ps_steps_eyebrow: "Como funciona", ps_steps_h: "Em seis passos:",
      ps_s1_t: "Definimos a sua busca.", ps_s1_d: "Zona, tipo, orçamento e objetivo: moradia, renda ou investimento.",
      ps_s2_t: "Buscamos em todo o mercado.", ps_s2_d: "Inclusive imóveis que ainda não foram publicados.",
      ps_s3_t: "Revisamos que esteja tudo em ordem.", ps_s3_d: "Títulos, dívidas, reputação da incorporadora, documentos e estado do imóvel.",
      ps_s4_t: "Mostramos uma seleção curta.", ps_s4_d: "Visitamos por você, com vídeo se compra à distância.",
      ps_s5_t: "Negociamos o preço.", ps_s5_d: "O melhor preço e as melhores condições.",
      ps_s6_t: "Acompanhamos até o final.", ps_s6_d: "Reserva, escritura e entrega das chaves.",
      ps_who_h: "Para quem é", ps_who_d: "Investidores, compradores do exterior ou do interior, e quem não tem tempo de cuidar da busca.",
      ps_fee_h: "Como trabalhamos", ps_fee_d: "Um honorário ao contratar e um percentual ao concretizar. As condições exatas se acordam na primeira conversa, sem compromisso.",
      ps_form_h: "Solicitar informação",
      ps_form_sub: "Deixe seus dados e entramos em contato.",
      f_nombre: "Nome", f_email: "E-mail", f_telefono: "Telefone", f_mensaje: "Mensagem",
      ph_nombre: "Seu nome", ph_email: "Seu e-mail", ph_telefono: "Seu telefone", ph_mensaje: "Mensagem (opcional)",
      f_enviar: "Enviar",
      ps_thanks: "Obrigado. Recebemos sua consulta e entraremos em contato em breve.",
      // Comprar
      cmp_eyebrow: "Comprar", cmp_h1: "Unidades à venda em Buenos Aires",
      cmp_psi_h2: "Comprar sem buscar, visitar nem negociar.",
      cmp_psi_p: "Você nos diz qual apartamento quer. Nós o revisamos, negociamos e compramos por você.",
      cmp_psi_btn: "Conhecer Personal Shopper",
      // Catálogo (aluguel)
      cat_back: "← Início", cat_barrios: "Bairros",
      ft_vender: "Vender meu imóvel",
      cat_todos: "Todos", cat_temporal: "Médio prazo", cat_tradicional: "Longo prazo",
      cat_p_todos: "Preço: todos", cat_p_1: "Até USD 1.000", cat_p_2: "USD 1.000 a 1.500", cat_p_3: "USD 1.500 a 2.500", cat_p_4: "USD 2.500 ou mais",
      cat_a_todos: "Ambientes: todos", cat_a_1: "1 ambiente", cat_a_2: "2 ambientes", cat_a_3: "3 ambientes", cat_a_4: "4 ou mais",
      chip_cochera: "Garagem", chip_pileta: "Piscina", chip_pet: "Aceita pets",
      cat_search_ph: "Buscar endereço ou bairro…",
      cat_barrio_head: "Selecione um bairro", cat_barrio_clear: "Limpar filtro",
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
      nav_comprar: "Buy", nav_alquilar: "Rent", nav_contacto: "Contact",
      nav_cta_info: "Request information", nav_cta_rep: "Buy with representation",
      // Footer
      ft_tag: "Premium apartments in Buenos Aires. Buy, sell and rent.",
      ft_ops: "Services", ft_comprar: "Buy", ft_alquilar: "Rent",
      ft_contacto: "Contact", ft_dev: "Developed by",
      ft_copy: "© 2026 Grupo Bairen. All rights reserved.",
      // Personal Shopper
      ps_h1: "Buy in Buenos Aires",
      ps_not1: "No searching", ps_not2: "No visiting", ps_not3: "No negotiating",
      ps_sub1: "We handle", ps_sub_em: "everything",
      ps_lead1: "You tell us which apartment you want. We review, negotiate and",
      ps_lead_b: "buy it for you.",
      ps_pdf: "Learn more about our service",
      ps_cta: "Request information", ps_video_eye: "The service, in one minute",
      ps_steps_eyebrow: "How it works", ps_steps_h: "In six steps:",
      ps_s1_t: "We define your search.", ps_s1_d: "Area, type, budget and goal: home, rental income or investment.",
      ps_s2_t: "We search the entire market.", ps_s2_d: "Including properties not yet listed.",
      ps_s3_t: "We verify everything is in order.", ps_s3_d: "Titles, debts, developer track record, paperwork and property condition.",
      ps_s4_t: "We show you a short selection.", ps_s4_d: "We visit for you, with video if you are buying from abroad.",
      ps_s5_t: "We negotiate the price.", ps_s5_d: "The best price and the best terms.",
      ps_s6_t: "We stay with you until the end.", ps_s6_d: "Reservation, deed and key handover.",
      ps_who_h: "Who it is for", ps_who_d: "Investors, buyers from abroad or from the provinces, and anyone without time to run the search.",
      ps_fee_h: "How we charge", ps_fee_d: "A fee when you hire us and a percentage at closing. Exact terms are agreed in the first call, with no obligation.",
      ps_form_h: "Request information",
      ps_form_sub: "Leave your details and we'll get in touch.",
      f_nombre: "Name", f_email: "Email", f_telefono: "Phone", f_mensaje: "Message",
      ph_nombre: "Your name", ph_email: "Your email", ph_telefono: "Your phone", ph_mensaje: "Message (optional)",
      f_enviar: "Send",
      ps_thanks: "Thank you. We received your inquiry and will contact you shortly.",
      // Comprar
      cmp_eyebrow: "Buy", cmp_h1: "Units for sale in Buenos Aires",
      cmp_psi_h2: "Buy without searching, visiting or negotiating.",
      cmp_psi_p: "You tell us which apartment you want. We review, negotiate and buy it for you.",
      cmp_psi_btn: "Discover Personal Shopper",
      // Catalogue (rentals)
      cat_back: "← Home", cat_barrios: "Neighbourhoods",
      ft_vender: "Sell my property",
      cat_todos: "All", cat_temporal: "Medium-term", cat_tradicional: "Long-term",
      cat_p_todos: "Price: all", cat_p_1: "Up to USD 1,000", cat_p_2: "USD 1,000 to 1,500", cat_p_3: "USD 1,500 to 2,500", cat_p_4: "USD 2,500+",
      cat_a_todos: "Rooms: all", cat_a_1: "1 room", cat_a_2: "2 rooms", cat_a_3: "3 rooms", cat_a_4: "4 or more",
      chip_cochera: "Parking", chip_pileta: "Pool", chip_pet: "Pet friendly",
      cat_search_ph: "Search address or neighbourhood…",
      cat_barrio_head: "Select a neighbourhood", cat_barrio_clear: "Clear filter",
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

  // Mensaje de WhatsApp pre-escrito por idioma (para links marcados data-wa).
  const WA = {
    es: "Hola buenas, mi nombre es [nombre] y me interesa su servicio de Personal Shopper, ¿Podría pedirles más información? Muchas gracias.",
    pt: "Olá, meu nome é [nome] e tenho interesse no seu serviço de Personal Shopper. Poderiam me enviar mais informações? Muito obrigado.",
    en: "Hi, my name is [name] and I'm interested in your Personal Shopper service. Could you send me more information? Thank you very much."
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
    // PDF por idioma: es -> personal-shopper.pdf ; pt/en -> personal-shopper-<lang>.pdf
    document.querySelectorAll('[data-pdf]').forEach(a => {
      a.setAttribute('href', lang === 'es' ? 'personal-shopper.pdf' : 'personal-shopper-' + lang + '.pdf');
    });
    // WhatsApp con mensaje pre-escrito por idioma
    document.querySelectorAll('[data-wa]').forEach(a => {
      a.setAttribute('href', 'https://wa.me/5491123106629?text=' + encodeURIComponent(WA[lang] || WA.es));
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
