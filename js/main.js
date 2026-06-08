/* ============================================================
   Cohesif Négoce — main.js
   ============================================================ */

const TVA = 0.20;

/* ---------- Helpers ---------- */
function formatPrix(montant){
  return montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function ttc(prixHT){ return prixHT * (1 + TVA); }

function getMode(){
  return localStorage.getItem('cn_pricing_mode') || 'HT';
}
function setMode(mode){
  localStorage.setItem('cn_pricing_mode', mode);
  applyPricingMode();
}

/* Applies HT/TTC mode across the whole page: any element with
   data-prix-ht receives the right formatted value + suffix */
function applyPricingMode(){
  const mode = getMode();

  document.querySelectorAll('[data-prix-ht]').forEach(el => {
    const ht = parseFloat(el.getAttribute('data-prix-ht'));
    if (Number.isNaN(ht)) return;
    const value = mode === 'TTC' ? ttc(ht) : ht;
    const suffixEl = el.querySelector('.price-suffix');
    const numberEl = el.querySelector('.price-number') || el;
    numberEl.textContent = formatPrix(value);
    if (suffixEl) suffixEl.textContent = mode === 'TTC' ? 'TTC' : 'HT';
  });

  document.querySelectorAll('.htttc-toggle').forEach(toggle => {
    toggle.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  });

  // Let pages recompute custom totals (e.g. product detail quantity total)
  document.dispatchEvent(new CustomEvent('cn:pricing-mode-changed', { detail: { mode } }));
}

function initPricingToggles(){
  document.querySelectorAll('.htttc-toggle').forEach(toggle => {
    toggle.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')));
    });
  });
  applyPricingMode();
}

/* ---------- Burger / mobile menu ---------- */
function initMobileMenu(){
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.mobile-menu');
  if (!burger || !menu) return;
  burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    menu.classList.toggle('open');
  });
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('active');
      menu.classList.remove('open');
    });
  });
}

/* ---------- Ticker (index only) ---------- */
function initTicker(){
  const track = document.querySelector('.ticker-track');
  if (!track) return;
  // Duplicate content for seamless infinite scroll
  track.innerHTML = track.innerHTML + track.innerHTML;
}

/* ---------- Animated counters on scroll ---------- */
function initCounters(){
  const counters = document.querySelectorAll('[data-count-to]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseFloat(el.getAttribute('data-count-to'));
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1400;
    const start = performance.now();

    function step(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = prefix + value.toLocaleString('fr-FR') + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted){
        entry.target.dataset.counted = 'true';
        animate(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));
}

/* ---------- Devis cart (localStorage) ---------- */
function getDevisCart(){
  try { return JSON.parse(localStorage.getItem('cn_devis_cart') || '[]'); }
  catch(e){ return []; }
}
function saveDevisCart(cart){
  localStorage.setItem('cn_devis_cart', JSON.stringify(cart));
  updateCartCount();
}
function addToDevisCart(produit, qty = 1){
  const cart = getDevisCart();
  const existing = cart.find(item => item.id === produit.id);
  if (existing) existing.qty += qty;
  else cart.push({ id: produit.id, nom: produit.nom, qty });
  saveDevisCart(cart);
}
function updateCartCount(){
  const count = getDevisCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = count; });
}

function initDevisButtons(produits){
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="add-devis"]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const produit = produits.find(p => p.id === id);
    if (!produit) return;
    addToDevisCart(produit, 1);
    const original = btn.textContent;
    btn.textContent = 'Ajouté ✓';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1400);
  });
  updateCartCount();
}

/* ---------- Product card builder ---------- */
function badgeClass(source){
  if (source === 'Stock Cohesif') return 'badge-stock';
  if (source === 'Partenaire Vérifié') return 'badge-partner';
  return 'badge-import';
}

function productCardHTML(p){
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="pc-media">
        <span class="badge ${badgeClass(p.source)} pc-badge">${p.source}</span>
        ${visualTileHTML(CATEGORY_VISUALS, p.categorie, p.id)}
      </div>
      <div class="pc-body">
        <span class="pc-cat">${p.categorie}</span>
        <h3 class="pc-title">${p.nom}</h3>
        <span class="pc-ref">Réf. ${p.id} · ${p.disponibilite}</span>
        <div class="pc-price-row">
          <span class="pc-price" data-prix-ht="${p.prixHT}">
            <span class="price-number">${formatPrix(p.prixHT)}</span> <small>/ ${p.unite} <span class="price-suffix">HT</span></small>
          </span>
          <span class="pc-delai">Délai ${p.delai}</span>
        </div>
        <div class="pc-actions">
          <button class="btn btn-primary" data-action="add-devis" data-id="${p.id}">Ajouter au devis</button>
          <a class="btn btn-outline" href="produit.html?id=${encodeURIComponent(p.id)}">Voir la fiche</a>
        </div>
      </div>
    </article>
  `;
}

/* ---------- Visual tiles ----------
   In place of stock photography (generic and rarely a true match for a
   specific reference), each category gets its own brand-consistent
   illustration: a gradient drawn from the palette, a glyph echoing the
   icons used on the homepage, and the item's reference for context. */
const CATEGORY_VISUALS = {
  'Bois & Charpente':     { cls: 'vt-bois',      icon: '▥' },
  'Métaux':               { cls: 'vt-metaux',    icon: '▦' },
  'Cuivre':               { cls: 'vt-cuivre',    icon: '◉' },
  'Cloisons & Doublages': { cls: 'vt-cloisons',  icon: '▤' },
  'Isolants':             { cls: 'vt-isolants',  icon: '▧' },
  'Fixations':            { cls: 'vt-fixations', icon: '✚' }
};
const ARTICLE_VISUALS = {
  'Marchés & Cotations':   { cls: 'vt-marches',  icon: '▲' },
  'Conseils achat':        { cls: 'vt-conseils', icon: '✎' },
  'BTP & Réglementation':  { cls: 'vt-btp',      icon: '⚖' },
  'Cohesif Négoce':        { cls: 'vt-cohesif',  icon: '⬢' }
};
function visualTileHTML(map, categorie, ref){
  const fallback = Object.values(map)[0];
  const v = map[categorie] || fallback;
  return `
    <div class="visual-tile ${v.cls}" role="img" aria-label="${categorie}${ref ? ' — réf. ' + ref : ''}">
      <span class="vt-icon" aria-hidden="true">${v.icon}</span>
      <div class="vt-meta">
        <span class="vt-cat">${categorie}</span>
        ${ref ? `<span class="vt-ref">Réf. ${ref}</span>` : ''}
      </div>
    </div>
  `;
}

/* ---------- Catalogue page ---------- */
function initCatalogue(produits){
  const grid = document.querySelector('[data-catalogue-grid]');
  if (!grid) return;

  const filters = {
    categorie: document.querySelector('[data-filter="categorie"]'),
    source: document.querySelector('[data-filter="source"]'),
    zone: document.querySelector('[data-filter="zone"]'),
    disponibilite: document.querySelector('[data-filter="disponibilite"]'),
    tri: document.querySelector('[data-filter="tri"]'),
    recherche: document.querySelector('[data-filter="recherche"]')
  };
  const countEl = document.querySelector('[data-results-count]');
  const emptyEl = document.querySelector('[data-empty-state]');

  function render(){
    let list = produits.slice();

    if (filters.categorie && filters.categorie.value){
      list = list.filter(p => p.categorie === filters.categorie.value);
    }
    if (filters.source && filters.source.value){
      list = list.filter(p => p.source === filters.source.value);
    }
    if (filters.zone && filters.zone.value){
      list = list.filter(p => p.zones.includes(filters.zone.value));
    }
    if (filters.disponibilite && filters.disponibilite.value){
      list = list.filter(p => p.disponibilite === filters.disponibilite.value);
    }
    if (filters.recherche && filters.recherche.value.trim()){
      const q = filters.recherche.value.trim().toLowerCase();
      list = list.filter(p =>
        p.nom.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.categorie.toLowerCase().includes(q)
      );
    }
    if (filters.tri && filters.tri.value){
      switch(filters.tri.value){
        case 'prix-asc': list.sort((a,b) => a.prixHT - b.prixHT); break;
        case 'prix-desc': list.sort((a,b) => b.prixHT - a.prixHT); break;
        case 'nom-asc': list.sort((a,b) => a.nom.localeCompare(b.nom)); break;
        case 'recent': list.sort((a,b) => new Date(b.dateMAJ) - new Date(a.dateMAJ)); break;
      }
    }

    grid.innerHTML = list.map(productCardHTML).join('');
    if (countEl) countEl.textContent = `${list.length} produit${list.length > 1 ? 's' : ''} trouvé${list.length > 1 ? 's' : ''}`;
    if (emptyEl) emptyEl.style.display = list.length ? 'none' : 'block';
    applyPricingMode();
  }

  Object.values(filters).forEach(input => {
    if (!input) return;
    const evt = (input.tagName === 'SELECT') ? 'change' : 'input';
    input.addEventListener(evt, render);
  });

  // Mobile collapsible filters
  const toggleBtn = document.querySelector('[data-filters-toggle]');
  const filtersRow = document.querySelector('[data-filters-row]');
  if (toggleBtn && filtersRow){
    toggleBtn.addEventListener('click', () => {
      filtersRow.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', filtersRow.classList.contains('open'));
    });
  }

  render();
}

/* ---------- Product detail page ---------- */
function initProductDetail(produits){
  const root = document.querySelector('[data-product-detail]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const produit = produits.find(p => p.id === id) || produits[0];
  if (!produit) return;

  // Breadcrumb
  const crumbCat = document.querySelector('[data-crumb-categorie]');
  const crumbName = document.querySelector('[data-crumb-nom]');
  if (crumbCat){ crumbCat.textContent = produit.categorie; crumbCat.href = `catalogue.html?categorie=${encodeURIComponent(produit.categorie)}`; }
  if (crumbName) crumbName.textContent = produit.nom;

  // Title / meta
  const titleEl = document.querySelector('[data-pd-title]');
  if (titleEl) titleEl.textContent = produit.nom;
  const refEl = document.querySelector('[data-pd-ref]');
  if (refEl) refEl.textContent = `Référence ${produit.id} · ${produit.categorie}`;

  const badgeEl = document.querySelector('[data-pd-badge]');
  if (badgeEl){
    badgeEl.textContent = produit.source;
    badgeEl.className = `badge ${badgeClass(produit.source)}`;
  }

  // Gallery
  const mainVisual = document.querySelector('[data-pd-main-visual]');
  if (mainVisual) mainVisual.innerHTML = visualTileHTML(CATEGORY_VISUALS, produit.categorie, produit.id);

  // Price block
  const priceMain = document.querySelector('[data-pd-price-main]');
  const priceSub = document.querySelector('[data-pd-price-sub]');
  if (priceMain) priceMain.setAttribute('data-prix-ht', produit.prixHT);
  function renderPrice(){
    const mode = getMode();
    const value = mode === 'TTC' ? ttc(produit.prixHT) : produit.prixHT;
    if (priceMain) priceMain.querySelector('.price-number') && (priceMain.querySelector('.price-number').textContent = formatPrix(value));
    if (priceSub){
      const other = mode === 'TTC' ? produit.prixHT : ttc(produit.prixHT);
      const otherLabel = mode === 'TTC' ? 'HT' : 'TTC';
      priceSub.textContent = `Soit ${formatPrix(other)} ${otherLabel} · prix au ${produit.unite} · TVA 20%`;
    }
  }

  // Meta row
  const metaDelai = document.querySelector('[data-pd-delai]');
  const metaDispo = document.querySelector('[data-pd-dispo]');
  const metaZones = document.querySelector('[data-pd-zones]');
  if (metaDelai) metaDelai.textContent = produit.delai;
  if (metaDispo) metaDispo.textContent = produit.disponibilite;
  if (metaZones) metaZones.textContent = produit.zones.join(', ');

  // Quantity + total
  const qtyInput = document.querySelector('[data-pd-qty]');
  const totalEl = document.querySelector('[data-pd-total]');
  function renderTotal(){
    const qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
    const mode = getMode();
    const unit = mode === 'TTC' ? ttc(produit.prixHT) : produit.prixHT;
    if (totalEl) totalEl.textContent = formatPrix(unit * qty);
  }
  document.querySelectorAll('[data-pd-qty-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-pd-qty-btn');
      let val = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      val = dir === 'inc' ? val + 1 : Math.max(1, val - 1);
      qtyInput.value = val;
      renderTotal();
    });
  });
  if (qtyInput) qtyInput.addEventListener('input', renderTotal);

  document.addEventListener('cn:pricing-mode-changed', () => { renderPrice(); renderTotal(); });
  renderPrice();
  renderTotal();

  // Add-to-quote with quantity
  const addBtn = document.querySelector('[data-pd-add]');
  if (addBtn){
    addBtn.addEventListener('click', () => {
      const qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
      addToDevisCart(produit, qty);
      const original = addBtn.textContent;
      addBtn.textContent = 'Ajouté au devis ✓';
      addBtn.disabled = true;
      setTimeout(() => { addBtn.textContent = original; addBtn.disabled = false; }, 1500);
    });
  }

  // Tabs (desktop) / accordion (mobile) — same markup driven by CSS
  const tabButtons = document.querySelectorAll('[data-pd-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-pd-tab');
      document.querySelectorAll('[data-pd-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-pd-panel]').forEach(p => p.classList.toggle('active', p.getAttribute('data-pd-panel') === target));
    });
  });

  // Specs content
  const specsList = document.querySelector('[data-pd-specs]');
  if (specsList){
    const entries = Object.entries(produit.specs || {});
    specsList.innerHTML = entries.length
      ? entries.map(([k,v]) => `<li><strong>${k}</strong><span>${v}</span></li>`).join('')
      : '<li>Caractéristiques détaillées disponibles sur demande.</li>';
  }
  const descEl = document.querySelector('[data-pd-description]');
  if (descEl) descEl.textContent = produit.description;

  // Same category grid
  const sameCatGrid = document.querySelector('[data-pd-samecat]');
  if (sameCatGrid){
    const sameCat = produits.filter(p => p.categorie === produit.categorie && p.id !== produit.id).slice(0, 3);
    sameCatGrid.innerHTML = sameCat.map(productCardHTML).join('');
  }

  // Carousel "souvent achetés ensemble"
  const carousel = document.querySelector('[data-pd-carousel]');
  if (carousel){
    const others = produits.filter(p => p.id !== produit.id);
    const picks = [];
    for (let i = 0; i < others.length && picks.length < 6; i += Math.floor(others.length / 6) || 1){
      picks.push(others[i]);
    }
    carousel.innerHTML = picks.slice(0, 6).map(productCardHTML).join('');
  }

  // Quote-express prefill quantity
  const qeQty = document.querySelector('[data-qe-qty]');
  if (qeQty && qtyInput) qeQty.value = qtyInput.value;

  applyPricingMode();
}

/* ---------- Generic accordion (mobile tabs / FAQ) ---------- */
function initAccordions(){
  document.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const wasOpen = item.classList.contains('open');
      if (item.parentElement.hasAttribute('data-accordion-exclusive')){
        item.parentElement.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      }
      item.classList.toggle('open', !wasOpen);
    });
  });
}

/* ---------- Carousel swipe (touch drag scroll is native via overflow-x) ---------- */
function initCarouselDrag(){
  document.querySelectorAll('.carousel').forEach(carousel => {
    let isDown = false, startX, scrollLeft;
    carousel.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - carousel.offsetLeft;
      scrollLeft = carousel.scrollLeft;
    });
    ['mouseleave','mouseup'].forEach(evt => carousel.addEventListener(evt, () => isDown = false));
    carousel.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - carousel.offsetLeft;
      carousel.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
  });
}

/* ---------- Catalogue actu filters ---------- */
function initActualites(articles){
  const grid = document.querySelector('[data-articles-grid]');
  if (!grid) return;

  const featured = articles[0];
  const rest = articles.slice(1);

  const featEl = document.querySelector('[data-featured-article]');
  if (featEl && featured){
    featEl.innerHTML = `
      <a class="fa-link" href="article.html?id=${featured.id}" aria-label="Lire l'article : ${featured.titre}">
        <div class="fa-media">${visualTileHTML(ARTICLE_VISUALS, featured.categorie)}</div>
        <div class="fa-body">
          <span class="cat-pill">${featured.categorie}</span>
          <h2>${featured.titre}</h2>
          <p>${featured.extrait}</p>
          <div class="fa-meta"><span>${formatDateFR(featured.date)}</span><span>·</span><span>${featured.lecture} de lecture</span></div>
        </div>
      </a>
    `;
  }

  const buttons = document.querySelectorAll('[data-actu-filter]');
  let currentFilter = 'Toutes';
  let currentPage = 1;
  const perPage = 6;
  const pagination = document.querySelector('[data-actu-pagination]');

  function render(){
    let list = currentFilter === 'Toutes' ? rest : rest.filter(a => a.categorie === currentFilter);
    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    currentPage = Math.min(currentPage, totalPages);
    const slice = list.slice((currentPage - 1) * perPage, currentPage * perPage);

    grid.innerHTML = slice.map(a => `
      <article class="article-card">
        <a class="ac-link" href="article.html?id=${a.id}" aria-label="Lire l'article : ${a.titre}">
          <div class="ac-media">${visualTileHTML(ARTICLE_VISUALS, a.categorie)}</div>
          <div class="ac-body">
            <span class="cat-pill">${a.categorie}</span>
            <h3>${a.titre}</h3>
            <p>${a.extrait}</p>
            <div class="fa-meta"><span>${formatDateFR(a.date)}</span><span>·</span><span>${a.lecture} de lecture</span></div>
          </div>
        </a>
      </article>
    `).join('');

    if (pagination){
      let html = '';
      for (let i = 1; i <= totalPages; i++){
        html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      pagination.innerHTML = html;
      pagination.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => { currentPage = parseInt(btn.getAttribute('data-page'), 10); render(); window.scrollTo({ top: grid.offsetTop - 120, behavior:'smooth' }); });
      });
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.toggle('active', b === btn));
      currentFilter = btn.getAttribute('data-actu-filter');
      currentPage = 1;
      render();
    });
  });

  render();
}
function formatDateFR(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* Lightweight body renderer: a line starting with "## " becomes a subheading */
function articleBodyHTML(blocks){
  return (blocks || []).map(b =>
    b.startsWith('## ') ? `<h2>${b.slice(3)}</h2>` : `<p>${b}</p>`
  ).join('');
}

/* ---------- Article detail page ---------- */
function initArticleDetail(articles){
  const root = document.querySelector('[data-article-detail]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const article = articles.find(a => a.id === id) || articles[0];
  if (!article) return;

  document.title = `${article.titre} — Cohesif Négoce`;

  const crumbCat = document.querySelector('[data-crumb-categorie]');
  const crumbTitre = document.querySelector('[data-crumb-titre]');
  if (crumbCat){ crumbCat.textContent = article.categorie; crumbCat.href = `actualites.html`; }
  if (crumbTitre) crumbTitre.textContent = article.titre;

  const catEl = document.querySelector('[data-art-cat]');
  if (catEl) catEl.textContent = article.categorie;
  const titreEl = document.querySelector('[data-art-titre]');
  if (titreEl) titreEl.textContent = article.titre;
  const dateEl = document.querySelector('[data-art-date]');
  if (dateEl) dateEl.textContent = formatDateFR(article.date);
  const lectureEl = document.querySelector('[data-art-lecture]');
  if (lectureEl) lectureEl.textContent = `${article.lecture} de lecture`;

  const visualEl = document.querySelector('[data-art-visual]');
  if (visualEl) visualEl.innerHTML = visualTileHTML(ARTICLE_VISUALS, article.categorie);

  const bodyEl = document.querySelector('[data-art-body]');
  if (bodyEl) bodyEl.innerHTML = articleBodyHTML(article.contenu && article.contenu.length ? article.contenu : [article.extrait]);

  const relatedEl = document.querySelector('[data-art-related]');
  if (relatedEl){
    const related = articles.filter(a => a.id !== article.id && a.categorie === article.categorie).slice(0, 3);
    const fallback = related.length ? related : articles.filter(a => a.id !== article.id).slice(0, 3);
    relatedEl.innerHTML = fallback.map(a => `
      <article class="article-card">
        <a class="ac-link" href="article.html?id=${a.id}" aria-label="Lire l'article : ${a.titre}">
          <div class="ac-media">${visualTileHTML(ARTICLE_VISUALS, a.categorie)}</div>
          <div class="ac-body">
            <span class="cat-pill">${a.categorie}</span>
            <h3>${a.titre}</h3>
            <p>${a.extrait}</p>
            <div class="fa-meta"><span>${formatDateFR(a.date)}</span><span>·</span><span>${a.lecture} de lecture</span></div>
          </div>
        </a>
      </article>
    `).join('');
  }
}

/* ---------- Devis form ---------- */
function initDevisForm(){
  const form = document.querySelector('[data-devis-form]');
  if (!form) return;

  const toggleBtns = document.querySelectorAll('[data-profil-toggle]');
  const siretGroup = document.querySelector('[data-siret-group]');
  let profil = 'professionnel';

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      profil = btn.getAttribute('data-profil-toggle');
      toggleBtns.forEach(b => b.classList.toggle('active', b === btn));
      if (siretGroup){
        siretGroup.style.display = profil === 'professionnel' ? 'flex' : 'none';
        siretGroup.querySelector('input').required = profil === 'professionnel';
      }
    });
  });

  const submitBtn = form.querySelector('button[type="submit"]');
  const confirmation = document.querySelector('[data-devis-confirmation]');
  const errorBox = document.querySelector('[data-devis-error]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()){ form.reportValidity(); return; }

    if (errorBox) errorBox.style.display = 'none';
    if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Envoi en cours…'; }

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      if (!res.ok) throw new Error('Erreur réseau');

      form.style.display = 'none';
      if (confirmation){
        confirmation.style.display = 'block';
        window.scrollTo({ top: confirmation.offsetTop - 140, behavior: 'smooth' });
      }
    } catch(err){
      if (errorBox){
        errorBox.style.display = 'block';
        window.scrollTo({ top: errorBox.offsetTop - 140, behavior: 'smooth' });
      }
      if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Envoyer ma demande de devis'; }
    }
  });
}

/* ---------- Sticky mobile devis bar ---------- */
function initStickyMobileBar(){
  document.querySelectorAll('[data-sticky-cart-count]').forEach(updateCartCountInline);
  function updateCartCountInline(el){
    el.textContent = getDevisCart().reduce((sum, item) => sum + item.qty, 0);
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="add-devis"]') || e.target.closest('[data-pd-add]')){
      document.querySelectorAll('[data-sticky-cart-count]').forEach(updateCartCountInline);
    }
  });
}

/* ---------- Data loading ---------- */
async function loadJSON(path){
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Erreur réseau');
    return await res.json();
  } catch(e){
    console.error('Impossible de charger', path, e);
    return [];
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  initMobileMenu();
  initTicker();
  initCounters();
  initAccordions();
  initCarouselDrag();
  initStickyMobileBar();
  initDevisForm();
  initPricingToggles();

  const needsProducts = document.querySelector('[data-catalogue-grid], [data-product-detail], [data-featured-products]');
  const needsArticles = document.querySelector('[data-articles-grid], [data-article-detail]');

  let produits = [];
  if (needsProducts){
    produits = await loadJSON('data/produits.json');
    initCatalogue(produits);
    initProductDetail(produits);
    initDevisButtons(produits);

    const featuredWrap = document.querySelector('[data-featured-products]');
    if (featuredWrap){
      const ids = ['CN-CU-TUB-1214', 'CN-OSB-3-18', 'CN-PL-BA13-250', 'CN-AC-HA10'];
      const featured = ids.map(id => produits.find(p => p.id === id)).filter(Boolean);
      featuredWrap.innerHTML = featured.map(productCardHTML).join('');
      applyPricingMode();
    }
  } else {
    updateCartCount();
  }

  if (needsArticles){
    const articles = await loadJSON('data/articles.json');
    initActualites(articles);
    initArticleDetail(articles);
  }
});
