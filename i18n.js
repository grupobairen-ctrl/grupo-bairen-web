/* i18n compartido de Bairen — banderas ES / PT / EN.
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
      ps_lead1: "Você nos diz qual apartamento quer. Nós o buscamos, revisamos, negociamos e",
      ps_lead_b: "compramos por você.",
      ps_pdf: "Conheça mais sobre nosso serviço",
      ps_form_h: "Solicitar informação",
      ps_form_sub: "Deixe seus dados e entramos em contato.",
      f_nombre: "Nome", f_email: "E-mail", f_telefono: "Telefone", f_mensaje: "Mensagem",
      ph_nombre: "Seu nome", ph_email: "Seu e-mail", ph_telefono: "Seu telefone", ph_mensaje: "Mensagem (opcional)",
      f_enviar: "Enviar",
      ps_thanks: "Obrigado. Recebemos sua consulta e entraremos em contato em breve.",
      // Comprar
      cmp_eyebrow: "Comprar", cmp_h1: "Unidades à venda em Buenos Aires",
      cmp_pronto: "Em breve",
      cmp_psi_h2: "Comprar sem buscar, visitar nem negociar.",
      cmp_psi_p: "Você nos diz qual apartamento quer. Nós o buscamos, revisamos, negociamos e compramos por você.",
      cmp_psi_btn: "Conhecer Personal Shopper",
      // Catálogo (aluguel)
      cat_back: "← Início", cat_barrios: "Bairros",
      cat_todos: "Todos", cat_temporal: "Temporada", cat_tradicional: "Tradicional",
      cat_search_ph: "Buscar endereço ou bairro…",
      cat_barrio_head: "Selecione um bairro", cat_barrio_clear: "Limpar filtro",
      cat_sort_default: "Ordem padrão", cat_sort_pasc: "Preço: do menor ao maior",
      cat_sort_pdesc: "Preço: do maior ao menor", cat_sort_m2: "Maior área",
      cat_copy: "© 2026 Grupo Bairen · Todos os direitos reservados"
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
      ps_lead1: "You tell us which apartment you want. We search, review, negotiate and",
      ps_lead_b: "buy it for you.",
      ps_pdf: "Learn more about our service",
      ps_form_h: "Request information",
      ps_form_sub: "Leave your details and we'll get in touch.",
      f_nombre: "Name", f_email: "Email", f_telefono: "Phone", f_mensaje: "Message",
      ph_nombre: "Your name", ph_email: "Your email", ph_telefono: "Your phone", ph_mensaje: "Message (optional)",
      f_enviar: "Send",
      ps_thanks: "Thank you. We received your inquiry and will contact you shortly.",
      // Comprar
      cmp_eyebrow: "Buy", cmp_h1: "Units for sale in Buenos Aires",
      cmp_pronto: "Coming soon",
      cmp_psi_h2: "Buy without searching, visiting or negotiating.",
      cmp_psi_p: "You tell us which apartment you want. We search, review, negotiate and buy it for you.",
      cmp_psi_btn: "Discover Personal Shopper",
      // Catalogue (rentals)
      cat_back: "← Home", cat_barrios: "Neighbourhoods",
      cat_todos: "All", cat_temporal: "Short-term", cat_tradicional: "Long-term",
      cat_search_ph: "Search address or neighbourhood…",
      cat_barrio_head: "Select a neighbourhood", cat_barrio_clear: "Clear filter",
      cat_sort_default: "Default order", cat_sort_pasc: "Price: low to high",
      cat_sort_pdesc: "Price: high to low", cat_sort_m2: "Largest area",
      cat_copy: "© 2026 Grupo Bairen · All rights reserved"
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
