#!/usr/bin/env node
/**
 * Générateur de site statique Sunikai — zéro dépendance.
 *
 *   node build.js
 *
 * Lit content/*.json, écrit des fichiers .html statiques à la racine.
 * Le contenu se modifie dans content/, jamais dans les .html générés
 * (ils sont écrasés à chaque build).
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));

const site = read('site.json');
const products = read('products.json');
const pages = read('pages.json');
const news = read('news.json').slice().sort((a, b) => b.date.localeCompare(a.date));

const LANGS = ['fr', 'en'];
const DOMAIN = site.brand.domain.replace(/\/$/, '');
const BUILD_YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ routes */

const ROUTES = {
  home:     { fr: '',                 en: 'en' },
  products: { fr: 'produits',         en: 'en/products' },
  services: { fr: 'services',         en: 'en/services' },
  about:    { fr: 'a-propos',         en: 'en/about' },
  news:     { fr: 'actualites',       en: 'en/news' },
  contact:  { fr: 'contact',          en: 'en/contact' },
  legal:    { fr: 'mentions-legales', en: 'en/legal-notice' },
};

const u = (key, lang) => '/' + (ROUTES[key][lang] ? ROUTES[key][lang] + '/' : '');
const productUrl = (p, lang) => (lang === 'fr' ? `/produits/${p.slug.fr}/` : `/en/products/${p.slug.en}/`);
const newsUrl = (n, lang) => (lang === 'fr' ? `/actualites/${n.slug.fr}/` : `/en/news/${n.slug.en}/`);
const catalogueUrl = (lang) => `/assets/files/catalogue-sunikai-${lang}.pdf`;
const hasCatalogue = (lang) => fs.existsSync(path.join(ROOT, `assets/files/catalogue-sunikai-${lang}.pdf`));

/* ------------------------------------------------------------------ helpers */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const strip = (s = '') => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const L = (obj, lang) => (obj && typeof obj === 'object' && !Array.isArray(obj) ? obj[lang] : obj);

const fmtDate = (iso, lang) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

/**
 * Balise <img> avec srcset si la variante -sm.jpg existe (générée par
 * tools/optimize-images.py). `sizes` décrit la largeur d'affichage réelle.
 */
function img(src, alt, opts) {
  const o = opts || {};
  const small = src.replace(/\.jpg$/i, '-sm.jpg');
  const hasSmall = fs.existsSync(path.join(ROOT, small.replace(/^\//, '')));
  const loading = o.eager ? ' fetchpriority="high"' : ' loading="lazy"';
  const srcset = hasSmall
    ? ` srcset="${small} 600w, ${src} 1200w" sizes="${o.sizes || '100vw'}"`
    : '';
  return `<img src="${src}"${srcset} alt="${esc(alt || '')}"${o.cls ? ` class="${o.cls}"` : ''}${loading} decoding="async">`;
}

const dimsLine = (p, t) =>
  [
    `${t.products.length} ${p.dims.length}`,
    `${t.products.width} ${p.dims.width}`,
    `${t.products.thickness} ${p.dims.thickness}`,
  ].join(' · ');

function write(routePath, html) {
  const clean = routePath.replace(/^\/|\/$/g, '');
  const dir = clean ? path.join(ROOT, clean) : ROOT;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  built.push('/' + (clean ? clean + '/' : ''));
}

const built = [];

/* ------------------------------------------------------------------- layout */

function icon(name) {
  const paths = {
    check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.3-4.3"/>',
    shield: '<path d="M12 3 5 6v6c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    mail: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    leaf: '<path d="M20 4C10 4 4 9 4 17c0 1 0 2 .5 3C8 13 13 10 19 9c-4 3-7 5-9 11"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
}

function header(lang, current, altHref) {
  const t = site.i18n[lang];
  const other = lang === 'fr' ? 'en' : 'fr';
  const link = (key) =>
    `<a href="${u(key, lang)}"${current === key ? ' aria-current="page"' : ''}>${esc(t.nav[key])}</a>`;
  return `
<a class="skip" href="#main">${esc(t.skipToContent)}</a>
<header class="site-header" id="siteHeader">
  <div class="wrap header-inner">
    <a class="logo" href="${u('home', lang)}" aria-label="Sunikai">
      <span class="logo-word">SUNIKAI</span>
      <span class="logo-sub">${esc(site.brand.tagline)}</span>
    </a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="siteNav" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <nav class="site-nav" id="siteNav">
      ${['products', 'services', 'about', 'news'].map(link).join('\n      ')}
      <div class="nav-tail">
        <a class="lang-switch" href="${altHref}" hreflang="${other}" lang="${other}">${esc(site.i18n[other].langName)}</a>
        <a class="btn btn-amber btn-sm" href="${u('contact', lang)}">${esc(t.cta.quote)}</a>
      </div>
    </nav>
  </div>
</header>`;
}

function footer(lang) {
  const t = site.i18n[lang];
  const contactLines = site.contacts
    .map((c) => {
      const bits = [];
      if (c.phone) bits.push(`<a href="tel:${c.phoneHref}">${esc(c.phone)}</a>`);
      if (c.email) bits.push(`<a href="mailto:${c.email}">${esc(c.email)}</a>`);
      return `<li><span class="f-name">${esc(c.name)}</span><span class="f-role">${esc(L(c.role, lang))}</span>${bits.join(' ')}</li>`;
    })
    .join('\n        ');
  return `
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <span class="logo-word">SUNIKAI</span>
      <span class="logo-sub">${esc(site.brand.tagline)}</span>
      <p>${esc(t.footer.blurb)}</p>
    </div>
    <div>
      <h3>${esc(t.footer.navTitle)}</h3>
      <ul class="plain">
        ${['home', 'products', 'services', 'about', 'news', 'contact']
          .map((k) => `<li><a href="${u(k, lang)}">${esc(t.nav[k])}</a></li>`)
          .join('\n        ')}
      </ul>
    </div>
    <div>
      <h3>${esc(t.footer.productsTitle)}</h3>
      <ul class="plain">
        ${products
          .slice(0, 6)
          .map((p) => `<li><a href="${productUrl(p, lang)}">${esc(L(p.name, lang))}</a></li>`)
          .join('\n        ')}
        <li><a href="${u('products', lang)}"><strong>${esc(t.cta.allProducts)}</strong></a></li>
        ${hasCatalogue(lang) ? `<li><a href="${catalogueUrl(lang)}" download>${esc(t.cta.downloadCatalogue)}</a></li>` : ''}
      </ul>
    </div>
    <div>
      <h3>${esc(t.footer.contactTitle)}</h3>
      <ul class="plain contacts">
        ${contactLines}
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <p>© ${BUILD_YEAR} Sunikai. ${esc(t.footer.rights)}</p>
    <p><a href="${u('legal', lang)}">${esc(t.footer.legal)}</a></p>
  </div>
</footer>`;
}

function layout({ lang, title, description, canonical, altHref, current, body, image, jsonld }) {
  const t = site.i18n[lang];
  const ogImage = DOMAIN + (image || '/assets/img/hero-cargo.jpg');
  const frHref = lang === 'fr' ? canonical : altHref;
  const enHref = lang === 'en' ? canonical : altHref;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${DOMAIN}${canonical}">
<link rel="alternate" hreflang="fr" href="${DOMAIN}${frHref}">
<link rel="alternate" hreflang="en" href="${DOMAIN}${enHref}">
<link rel="alternate" hreflang="x-default" href="${DOMAIN}${frHref}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sunikai">
<meta property="og:locale" content="${t.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${DOMAIN}${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#12657A">
${site.brand.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(site.brand.googleSiteVerification)}">` : ''}
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
${header(lang, current, altHref)}
<main id="main">
${body}
</main>
${footer(lang)}
<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

/* -------------------------------------------------------------- components */

function ctaBand(lang) {
  const t = site.i18n[lang];
  return `
<section class="band-cta">
  ${img('/assets/img/cta-entrepot.jpg', '', { sizes: '100vw' })}
  <div class="wrap band-cta-inner">
    <h2>${esc(t.cta.quoteLong)}</h2>
    <div class="band-actions">
      <a class="btn btn-teal" href="${u('contact', lang)}">${esc(t.cta.contactUs)}</a>
      <a class="btn btn-ghost-dark" href="mailto:${site.brand.email}">${esc(site.brand.email)}</a>
    </div>
  </div>
</section>`;
}

function productCard(p, lang, t) {
  return `
<a class="card product-card" href="${productUrl(p, lang)}">
  <div class="card-media">
    ${img(p.image, L(p.name, lang), { sizes: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 370px' })}
    <span class="tag">${esc(L(p.category, lang))}</span>
  </div>
  <div class="card-body">
    <h3>${esc(L(p.name, lang))}</h3>
    <p class="card-sub">${esc(L(p.subtitle, lang))}</p>
    <p class="card-dims">${esc(dimsLine(p, t))} ${esc(t.products.mm)}</p>
    <span class="card-link">${esc(t.cta.seeProduct)} ${icon('arrow')}</span>
  </div>
</a>`;
}

function pageHead(kicker, title, lead) {
  return `
<section class="page-head">
  <div class="wrap">
    ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  </div>
</section>`;
}

/* ------------------------------------------------------------------- pages */

function homePage(lang) {
  const t = site.i18n[lang];
  const serviceIcons = { sourcing: 'search', 'controle-qualite': 'shield', 'import-livraison': 'truck' };
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sunikai',
    url: DOMAIN + '/',
    logo: DOMAIN + '/assets/img/logo-sunikai.jpg',
    description: strip(t.home.heroLead),
    email: site.brand.email,
    areaServed: 'Europe',
    contactPoint: site.contacts
      .filter((c) => c.phoneHref || c.email)
      .map((c) => ({
        '@type': 'ContactPoint',
        name: c.name,
        contactType: 'sales',
        ...(c.phoneHref ? { telephone: c.phoneHref } : {}),
        ...(c.email ? { email: c.email } : {}),
        availableLanguage: ['fr', 'en'],
      })),
  };

  const body = `
<section class="hero">
  ${img('/assets/img/hero-cargo.jpg', '', { cls: 'hero-bg', eager: true, sizes: '100vw' })}
  <div class="wrap hero-inner">
    <p class="kicker kicker-amber">${esc(site.brand.tagline)}</p>
    <h1>${t.home.heroTitle}</h1>
    <p class="lead">${esc(t.home.heroLead)}</p>
    <div class="hero-actions">
      <a class="btn btn-amber" href="${u('contact', lang)}">${esc(t.cta.quote)}</a>
      <a class="btn btn-ghost" href="${u('products', lang)}">${esc(t.cta.seeProducts)}</a>
    </div>
  </div>
</section>

<section class="trust-bar">
  <div class="wrap trust-grid">
    ${t.home.trust.map((x) => `<p>${icon('check')}<span>${esc(x)}</span></p>`).join('\n    ')}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2>${esc(t.home.servicesTitle)}</h2>
      <p class="lead">${esc(t.home.servicesLead)}</p>
    </div>
    <div class="grid grid-3">
      ${pages.services
        .map(
          (s) => `
      <a class="card service-card" href="${u('services', lang)}#${s.id}">
        <div class="card-media">
          ${img(s.image, '', { sizes: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 370px' })}
        </div>
        <div class="card-body">
          <span class="service-icon">${icon(serviceIcons[s.id] || 'check')}</span>
          <h3>${esc(L(s.title, lang))}</h3>
          <p>${esc(L(s.short, lang))}</p>
          <span class="card-link">${esc(t.cta.learnMore)} ${icon('arrow')}</span>
        </div>
      </a>`
        )
        .join('')}
    </div>
  </div>
</section>

<section class="section section-sand">
  <div class="wrap">
    <div class="section-head section-head-row">
      <div>
        <h2>${esc(t.home.productsTitle)}</h2>
        <p class="lead">${esc(t.home.productsLead)}</p>
      </div>
      <a class="btn btn-outline" href="${u('products', lang)}">${esc(t.cta.allProducts)}</a>
    </div>
    <div class="grid grid-3">
      ${products.slice(0, 6).map((p) => productCard(p, lang, t)).join('')}
    </div>
  </div>
</section>

<section class="section section-teal">
  <div class="wrap">
    <div class="section-head">
      <h2>${esc(t.home.whyTitle)}</h2>
    </div>
    <div class="grid grid-3 why-grid">
      ${pages.why
        .map(
          (w) => `
      <div class="why-item">
        <h3>${esc(L(w.title, lang))}</h3>
        <p>${esc(L(w.text, lang))}</p>
      </div>`
        )
        .join('')}
    </div>
    <div class="figures">
      ${pages.about.figures
        .map(
          (f) => `<div class="figure"><span class="figure-value">${esc(f.value)}</span><span class="figure-label">${esc(L(f.label, lang))}</span></div>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>

${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'home',
    title:
      lang === 'fr'
        ? 'Sunikai — Import de bois d’Asie : panneaux, parquets, terrasses'
        : 'Sunikai — Asian timber import: panels, flooring, decking',
    description: strip(t.home.heroLead),
    canonical: u('home', lang),
    altHref: u('home', lang === 'fr' ? 'en' : 'fr'),
    body,
    jsonld,
  });
}

function productsPage(lang) {
  const t = site.i18n[lang];
  const cats = [...new Set(products.map((p) => L(p.category, lang)))];
  const body = `
${pageHead(site.brand.tagline, t.products.title, t.products.lead)}
<section class="section section-tight">
  <div class="wrap">
    <div class="filters-row">
      <div class="filters" role="group" aria-label="${esc(t.products.title)}">
        <button class="chip is-active" type="button" data-cat="all">${esc(t.cta.allProducts)}</button>
        ${cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c)}">${esc(c)}</button>`).join('\n        ')}
      </div>
      ${hasCatalogue(lang) ? `<a class="btn btn-outline btn-sm" href="${catalogueUrl(lang)}" download>${icon('doc')} ${esc(t.cta.downloadCatalogue)}</a>` : ''}
    </div>
    <div class="grid grid-3" id="productGrid">
      ${products
        .map((p) => productCard(p, lang, t).replace('<a class="card product-card"', `<a class="card product-card" data-cat="${esc(L(p.category, lang))}"`))
        .join('')}
    </div>
    <p class="note">${icon('doc')} ${esc(t.products.onRequest)}</p>
  </div>
</section>
${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'products',
    title: `${t.products.title} — Sunikai`,
    description: strip(t.products.lead),
    canonical: u('products', lang),
    altHref: u('products', lang === 'fr' ? 'en' : 'fr'),
    body,
    image: products[0].image,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: t.products.title,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: L(p.name, lang),
        url: DOMAIN + productUrl(p, lang),
      })),
    },
  });
}

function productPage(p, lang) {
  const t = site.i18n[lang];
  const related = products.filter((x) => x.id !== p.id && L(x.category, lang) === L(p.category, lang)).slice(0, 3);
  const fill = products.filter((x) => x.id !== p.id && !related.includes(x)).slice(0, 3 - related.length);
  const rel = related.concat(fill);

  const specRow = (label, value) =>
    value ? `<div class="spec"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>` : '';

  const body = `
<nav class="breadcrumb" aria-label="Breadcrumb">
  <div class="wrap">
    <a href="${u('home', lang)}">${esc(t.nav.home)}</a>
    <span>/</span>
    <a href="${u('products', lang)}">${esc(t.nav.products)}</a>
    <span>/</span>
    <span aria-current="page">${esc(L(p.name, lang))}</span>
  </div>
</nav>

<section class="product-hero">
  <div class="wrap product-hero-grid">
    <div class="product-visual">
      ${img(p.image, L(p.name, lang), { eager: true, sizes: '(max-width: 860px) 100vw, 570px' })}
    </div>
    <div class="product-intro">
      <p class="kicker">${esc(L(p.category, lang))}</p>
      <h1>${esc(L(p.name, lang))}</h1>
      <p class="product-subtitle">${esc(L(p.subtitle, lang))}</p>
      <p class="lead">${esc(L(p.intro, lang))}</p>

      <h2 class="mini-title">${esc(t.products.dimensions)} <span>(${esc(t.products.mm)})</span></h2>
      <dl class="dims">
        <div><dt>${esc(t.products.length)}</dt><dd>${esc(p.dims.length)}</dd></div>
        <div><dt>${esc(t.products.width)}</dt><dd>${esc(p.dims.width)}</dd></div>
        <div><dt>${esc(t.products.thickness)}</dt><dd>${esc(p.dims.thickness)}</dd></div>
      </dl>
      <p class="note-inline">${esc(t.products.onRequest)}</p>

      <div class="product-actions">
        <a class="btn btn-amber" href="${u('contact', lang)}?product=${encodeURIComponent(p.id)}">${esc(t.cta.quoteThis)}</a>
        <a class="btn btn-outline" href="${u('products', lang)}">${esc(t.cta.backToProducts)}</a>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap product-detail">
    <div class="prose">
      ${L(p.body, lang).map((para) => `<p>${esc(para)}</p>`).join('\n      ')}
      <h2>${esc(t.products.uses)}</h2>
      <ul class="ticks">
        ${L(p.uses, lang).map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('\n        ')}
      </ul>
    </div>
    <aside class="spec-box">
      <h2>${esc(t.products.specs)}</h2>
      <dl>
        ${specRow(t.products.species, L(p.specs.species, lang))}
        ${specRow(t.products.quality, L(p.specs.quality, lang))}
        ${specRow(t.products.structure, L(p.specs.structure, lang))}
        ${specRow(t.products.finish, L(p.specs.finish, lang))}
        ${specRow(t.products.length, p.dims.length + ' ' + t.products.mm)}
        ${specRow(t.products.width, p.dims.width + ' ' + t.products.mm)}
        ${specRow(t.products.thickness, p.dims.thickness + ' ' + t.products.mm)}
      </dl>
      <a class="btn btn-teal btn-block" href="${u('contact', lang)}?product=${encodeURIComponent(p.id)}">${esc(t.cta.quote)}</a>
    </aside>
  </div>
</section>

<section class="section section-sand">
  <div class="wrap">
    <div class="section-head"><h2>${esc(t.products.related)}</h2></div>
    <div class="grid grid-3">
      ${rel.map((x) => productCard(x, lang, t)).join('')}
    </div>
  </div>
</section>

${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'products',
    title: `${L(p.name, lang)} — ${L(p.subtitle, lang)} | Sunikai`,
    description: strip(L(p.intro, lang)),
    canonical: productUrl(p, lang),
    altHref: productUrl(p, lang === 'fr' ? 'en' : 'fr'),
    image: p.image,
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: L(p.name, lang),
      image: DOMAIN + p.image,
      description: strip(L(p.intro, lang)),
      category: L(p.category, lang),
      material: L(p.specs.species, lang),
      brand: { '@type': 'Brand', name: 'Sunikai' },
    },
  });
}

function servicesPage(lang) {
  const t = site.i18n[lang];
  const body = `
${pageHead(site.brand.tagline, t.services.title, t.services.lead)}
${pages.services
  .map(
    (s, i) => `
<section class="section ${i % 2 ? 'section-sand' : ''}" id="${s.id}">
  <div class="wrap split ${i % 2 ? 'split-reverse' : ''}">
    <div class="split-media">
      ${img(s.image, '', { sizes: '(max-width: 860px) 100vw, 540px' })}
    </div>
    <div class="split-text prose">
      <p class="kicker">0${i + 1}</p>
      <h2>${esc(L(s.title, lang))}</h2>
      ${L(s.body, lang).map((para) => `<p>${esc(para)}</p>`).join('\n      ')}
      <ul class="ticks">
        ${L(s.points, lang).map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>`
  )
  .join('')}
${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'services',
    title: `${t.services.title} — Sunikai`,
    description: strip(t.services.lead),
    canonical: u('services', lang),
    altHref: u('services', lang === 'fr' ? 'en' : 'fr'),
    image: pages.services[0].image,
    body,
  });
}

function aboutPage(lang) {
  const t = site.i18n[lang];
  const body = `
${pageHead(site.brand.tagline, t.about.title, t.about.lead)}
<section class="section section-tight">
  <div class="wrap narrow prose">
    ${L(pages.about.body, lang).map((para) => `<p>${esc(para)}</p>`).join('\n    ')}
  </div>
</section>

<section class="section section-teal">
  <div class="wrap">
    <div class="section-head"><h2>${esc(t.home.whyTitle)}</h2></div>
    <div class="grid grid-3 why-grid">
      ${pages.why.map((w) => `
      <div class="why-item">
        <h3>${esc(L(w.title, lang))}</h3>
        <p>${esc(L(w.text, lang))}</p>
      </div>`).join('')}
    </div>
    <div class="figures">
      ${pages.about.figures
        .map((f) => `<div class="figure"><span class="figure-value">${esc(f.value)}</span><span class="figure-label">${esc(L(f.label, lang))}</span></div>`)
        .join('\n      ')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head"><h2>${esc(t.contact.teamTitle)}</h2></div>
    <div class="grid grid-2 team-grid">
      ${site.contacts
        .map(
          (c) => `
      <div class="team-card">
        <h3>${esc(c.name)}</h3>
        <p class="team-role">${esc(L(c.role, lang))}</p>
        <p class="team-links">
          ${c.phone ? `<a href="tel:${c.phoneHref}">${icon('phone')} ${esc(c.phone)}</a>` : ''}
          ${c.email ? `<a href="mailto:${c.email}">${icon('mail')} ${esc(c.email)}</a>` : ''}
        </p>
      </div>`
        )
        .join('')}
    </div>
  </div>
</section>
${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'about',
    title: `${t.about.title} — Sunikai`,
    description: strip(L(pages.about.body, lang)[0]),
    canonical: u('about', lang),
    altHref: u('about', lang === 'fr' ? 'en' : 'fr'),
    body,
  });
}

function newsIndexPage(lang) {
  const t = site.i18n[lang];
  const body = `
${pageHead(site.brand.tagline, t.news.title, t.news.lead)}
<section class="section section-tight">
  <div class="wrap">
    ${
      news.length
        ? `<div class="grid grid-3">
      ${news
        .map(
          (n) => `
      <a class="card news-card" href="${newsUrl(n, lang)}">
        <div class="card-media">${img(n.image, '', { sizes: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 370px' })}</div>
        <div class="card-body">
          <time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time>
          <h3>${esc(L(n.title, lang))}</h3>
          <p>${esc(L(n.excerpt, lang))}</p>
          <span class="card-link">${esc(t.news.readMore)} ${icon('arrow')}</span>
        </div>
      </a>`
        )
        .join('')}
    </div>`
        : `<p class="lead">${esc(t.news.empty)}</p>`
    }
  </div>
</section>
${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'news',
    title: `${t.news.title} — Sunikai`,
    description: strip(t.news.lead),
    canonical: u('news', lang),
    altHref: u('news', lang === 'fr' ? 'en' : 'fr'),
    body,
  });
}

function newsPage(n, lang) {
  const t = site.i18n[lang];
  const others = news.filter((x) => x.id !== n.id).slice(0, 3);
  const body = `
<nav class="breadcrumb" aria-label="Breadcrumb">
  <div class="wrap">
    <a href="${u('home', lang)}">${esc(t.nav.home)}</a>
    <span>/</span>
    <a href="${u('news', lang)}">${esc(t.nav.news)}</a>
    <span>/</span>
    <span aria-current="page">${esc(L(n.title, lang))}</span>
  </div>
</nav>

<article>
  <header class="article-head">
    <div class="wrap narrow">
      <time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time>
      <h1>${esc(L(n.title, lang))}</h1>
      <p class="lead">${esc(L(n.excerpt, lang))}</p>
    </div>
    <div class="wrap">
      <div class="article-media">${img(n.image, '', { eager: true, sizes: '(max-width: 1200px) 100vw, 1140px' })}</div>
    </div>
  </header>
  <div class="section section-tight">
    <div class="wrap narrow prose">
      ${L(n.body, lang).join('\n      ')}
      <p class="back"><a href="${u('news', lang)}">${esc(t.news.backToNews)}</a></p>
    </div>
  </div>
</article>

${
  others.length
    ? `<section class="section section-sand">
  <div class="wrap">
    <div class="section-head"><h2>${esc(t.nav.news)}</h2></div>
    <div class="grid grid-3">
      ${others
        .map(
          (o) => `
      <a class="card news-card" href="${newsUrl(o, lang)}">
        <div class="card-media">${img(o.image, '', { sizes: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 370px' })}</div>
        <div class="card-body">
          <time datetime="${o.date}">${esc(fmtDate(o.date, lang))}</time>
          <h3>${esc(L(o.title, lang))}</h3>
          <span class="card-link">${esc(t.news.readMore)} ${icon('arrow')}</span>
        </div>
      </a>`
        )
        .join('')}
    </div>
  </div>
</section>`
    : ''
}
${ctaBand(lang)}`;

  return layout({
    lang,
    current: 'news',
    title: `${L(n.title, lang)} — Sunikai`,
    description: strip(L(n.excerpt, lang)),
    canonical: newsUrl(n, lang),
    altHref: newsUrl(n, lang === 'fr' ? 'en' : 'fr'),
    image: n.image,
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: L(n.title, lang),
      description: strip(L(n.excerpt, lang)),
      image: DOMAIN + n.image,
      datePublished: n.date,
      inLanguage: lang,
      author: { '@type': 'Organization', name: 'Sunikai' },
      publisher: { '@type': 'Organization', name: 'Sunikai' },
    },
  });
}

function contactPage(lang) {
  const t = site.i18n[lang];
  const f = t.contact.fields;
  const configured = !!site.formEndpoint && !/^A_CONFIGURER$/.test(site.formEndpoint);

  const field = (name, label, type = 'text', required = false, extra = '') => `
      <p class="field">
        <label for="f-${name}">${esc(label)}${required ? ' <abbr title="' + esc(f.required) + '">*</abbr>' : ''}</label>
        <input id="f-${name}" name="${name}" type="${type}"${required ? ' required' : ''}${extra}>
      </p>`;

  const body = `
${pageHead(site.brand.tagline, t.contact.title, t.contact.lead)}
<section class="section section-tight">
  <div class="wrap contact-grid">
    <div class="form-card">
      <h2>${esc(t.contact.formTitle)}</h2>
      ${configured ? '' : `<p class="alert">${esc(t.contact.notConfigured)}</p>`}
      <form id="quoteForm" action="${esc(configured ? site.formEndpoint : '')}" method="POST" novalidate>
        ${site.formAccessKey
          ? `<input type="hidden" name="access_key" value="${esc(site.formAccessKey)}">
        <input type="hidden" name="subject" value="Sunikai — ${esc(t.contact.formTitle)} (${lang.toUpperCase()})">
        <input type="hidden" name="from_name" value="Site sunikai.com">
        <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">`
          : `<input type="hidden" name="_subject" value="Sunikai — ${esc(t.contact.formTitle)}">
        <input type="hidden" name="_language" value="${lang}">
        <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">`}
        <div class="field-row">
          ${field('name', f.name, 'text', true, ' autocomplete="name"')}
          ${field('company', f.company, 'text', false, ' autocomplete="organization"')}
        </div>
        <div class="field-row">
          ${field('email', f.email, 'email', true, ' autocomplete="email"')}
          ${field('phone', f.phone, 'tel', false, ' autocomplete="tel"')}
        </div>
        <div class="field-row">
          ${field('country', f.country, 'text', false, ' autocomplete="country-name"')}
          <p class="field">
            <label for="f-product">${esc(f.product)}</label>
            <select id="f-product" name="product">
              <option value="">${esc(f.productPlaceholder)}</option>
              ${products.map((p) => `<option value="${esc(p.id)}">${esc(L(p.name, lang))} — ${esc(L(p.subtitle, lang))}</option>`).join('\n              ')}
              <option value="other">${esc(f.productOther)}</option>
            </select>
          </p>
        </div>
        <p class="field">
          <label for="f-volume">${esc(f.volume)}</label>
          <input id="f-volume" name="volume" type="text" placeholder="${esc(f.volumePlaceholder)}">
        </p>
        <p class="field">
          <label for="f-message">${esc(f.message)} <abbr title="${esc(f.required)}">*</abbr></label>
          <textarea id="f-message" name="message" rows="6" required placeholder="${esc(f.messagePlaceholder)}"></textarea>
        </p>
        <p class="field field-check">
          <input id="f-consent" name="consent" type="checkbox" required>
          <label for="f-consent">${esc(f.consent)}</label>
        </p>
        <p class="form-actions">
          <button class="btn btn-amber" type="submit"${configured ? '' : ' disabled title="' + esc(t.contact.notConfigured) + '"'}>${esc(f.submit)}</button>
        </p>
        <p class="form-status" id="formStatus" role="status" aria-live="polite"
           data-success="${esc(t.contact.success)}" data-error="${esc(t.contact.error)}"></p>
      </form>
    </div>

    <aside class="contact-aside">
      <h2>${esc(t.contact.teamTitle)}</h2>
      ${site.contacts
        .map(
          (c) => `
      <div class="team-card">
        <h3>${esc(c.name)}</h3>
        <p class="team-role">${esc(L(c.role, lang))}</p>
        <p class="team-links">
          ${c.phone ? `<a href="tel:${c.phoneHref}">${icon('phone')} ${esc(c.phone)}</a>` : ''}
          ${c.email ? `<a href="mailto:${c.email}">${icon('mail')} ${esc(c.email)}</a>` : ''}
        </p>
      </div>`
        )
        .join('')}
      ${hasCatalogue(lang) ? `<a class="btn btn-outline btn-block" href="${catalogueUrl(lang)}" download>${icon('doc')} ${esc(t.cta.downloadCatalogue)}</a>` : ''}
      <div class="aside-note">
        ${icon('globe')}
        <p>${esc(lang === 'fr' ? 'Nous répondons en français et en anglais, sous 48 h ouvrées.' : 'We answer in French and English, within 2 working days.')}</p>
      </div>
    </aside>
  </div>
</section>`;

  return layout({
    lang,
    current: 'contact',
    title: `${t.contact.title} — Sunikai`,
    description: strip(t.contact.lead),
    canonical: u('contact', lang),
    altHref: u('contact', lang === 'fr' ? 'en' : 'fr'),
    body,
  });
}

function legalPage(lang) {
  const t = site.i18n[lang];
  const fr = `
    <p>Ce site est édité par Sunikai.</p>
    <h2>Éditeur</h2>
    <p>Sunikai — sourcing, import, export de produits en bois.<br>
    Contact : <a href="mailto:${site.brand.email}">${site.brand.email}</a></p>
    <h2>Hébergement</h2>
    <p>GitHub Pages — GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
    <h2>Données personnelles</h2>
    <p>Les informations transmises via le formulaire de contact sont utilisées uniquement pour répondre à votre demande commerciale. Elles ne sont ni vendues ni cédées à des tiers. Vous pouvez demander leur suppression à tout moment en écrivant à <a href="mailto:${site.brand.email}">${site.brand.email}</a>.</p>
    <h2>Cookies</h2>
    <p>Ce site ne dépose aucun cookie de mesure d'audience ni de publicité.</p>
    <h2>Propriété intellectuelle</h2>
    <p>L'ensemble des contenus de ce site (textes, photographies, marque Sunikai) est protégé. Toute reproduction sans autorisation est interdite.</p>`;
  const en = `
    <p>This website is published by Sunikai.</p>
    <h2>Publisher</h2>
    <p>Sunikai — sourcing, import and export of wood products.<br>
    Contact: <a href="mailto:${site.brand.email}">${site.brand.email}</a></p>
    <h2>Hosting</h2>
    <p>GitHub Pages — GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA.</p>
    <h2>Personal data</h2>
    <p>Information sent through the contact form is used solely to answer your commercial enquiry. It is neither sold nor passed on to third parties. You may request its deletion at any time by writing to <a href="mailto:${site.brand.email}">${site.brand.email}</a>.</p>
    <h2>Cookies</h2>
    <p>This site sets no analytics or advertising cookies.</p>
    <h2>Intellectual property</h2>
    <p>All content on this site (texts, photographs, the Sunikai brand) is protected. Reproduction without permission is prohibited.</p>`;

  const body = `
${pageHead('', t.footer.legal, '')}
<section class="section section-tight">
  <div class="wrap narrow prose">${lang === 'fr' ? fr : en}</div>
</section>`;

  return layout({
    lang,
    current: 'legal',
    title: `${t.footer.legal} — Sunikai`,
    description: t.footer.legal,
    canonical: u('legal', lang),
    altHref: u('legal', lang === 'fr' ? 'en' : 'fr'),
    body,
  });
}

function notFoundPage() {
  const lang = 'fr';
  const t = site.i18n[lang];
  const body = `
<section class="section section-tight" style="min-height:50vh">
  <div class="wrap narrow prose" style="text-align:center">
    <p class="kicker">404</p>
    <h1>Page introuvable / Page not found</h1>
    <p class="lead">Cette page n'existe pas ou a été déplacée.<br>This page does not exist or has moved.</p>
    <p><a class="btn btn-amber" href="/">${esc(t.nav.home)}</a> <a class="btn btn-outline" href="/en/">Home</a></p>
  </div>
</section>`;
  return layout({
    lang,
    current: 'home',
    title: '404 — Sunikai',
    description: 'Page introuvable',
    canonical: '/404.html',
    altHref: '/',
    body,
  });
}

/* ------------------------------------------------------------- extra files */

function sitemapXml() {
  const urls = built.filter((x) => !x.includes('404'));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((x) => `  <url><loc>${DOMAIN}${x}</loc></url>`).join('\n')}
</urlset>
`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
}

function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="10" fill="#F7B32B"/>
<text x="32" y="45" font-family="Archivo, Arial, Helvetica, sans-serif" font-size="40" font-weight="800" text-anchor="middle" fill="#12657A">S</text>
</svg>
`;
}

/* -------------------------------------------------------------------- run */

function clean() {
  // Supprime uniquement les dossiers de pages générées, jamais assets/ ni content/.
  const generated = new Set();
  for (const lang of LANGS) {
    for (const key of Object.keys(ROUTES)) {
      const r = ROUTES[key][lang];
      if (r) generated.add(r.split('/')[0]);
    }
  }
  generated.add('produits');
  generated.add('actualites');
  for (const dir of generated) {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  }
}

function run() {
  clean();

  for (const lang of LANGS) {
    write(u('home', lang), homePage(lang));
    write(u('products', lang), productsPage(lang));
    write(u('services', lang), servicesPage(lang));
    write(u('about', lang), aboutPage(lang));
    write(u('news', lang), newsIndexPage(lang));
    write(u('contact', lang), contactPage(lang));
    write(u('legal', lang), legalPage(lang));
    for (const p of products) write(productUrl(p, lang), productPage(p, lang));
    for (const n of news) write(newsUrl(n, lang), newsPage(n, lang));
  }

  fs.writeFileSync(path.join(ROOT, '404.html'), notFoundPage(), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml(), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robotsTxt(), 'utf8');
  fs.writeFileSync(path.join(ROOT, '.nojekyll'), '', 'utf8');
  fs.writeFileSync(path.join(ROOT, 'assets', 'img', 'favicon.svg'), faviconSvg(), 'utf8');

  // CNAME : uniquement quand le domaine perso est réellement branché.
  // Tant que brand.customDomainActive vaut false, GitHub Pages sert le site sur
  // <compte>.github.io ; un CNAME présent ferait rediriger vers sunikai.com,
  // qui ne pointe pas encore ici — le site paraîtrait cassé.
  const cnamePath = path.join(ROOT, 'CNAME');
  if (site.brand.customDomainActive) {
    fs.writeFileSync(cnamePath, DOMAIN.replace(/^https?:\/\//, '') + '\n', 'utf8');
  } else if (fs.existsSync(cnamePath)) {
    fs.unlinkSync(cnamePath);
  }

  console.log(`✓ ${built.length} pages générées`);
  built.forEach((b) => console.log('  ' + b));
}

run();
