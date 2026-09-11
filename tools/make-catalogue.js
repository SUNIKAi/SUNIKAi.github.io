#!/usr/bin/env node
/**
 * Génère le catalogue PDF (FR + EN) à partir de content/products.json.
 *
 *   node tools/make-catalogue.js
 *
 * Étape 1 : construit une page HTML au format A4 dans tools/_print/
 * Étape 2 : l'imprime en PDF avec Chrome en mode headless
 *           → assets/files/catalogue-sunikai-fr.pdf et -en.pdf
 *
 * Si Chrome n'est pas trouvé, le HTML reste dans tools/_print/ : il suffit de
 * l'ouvrir dans un navigateur et de faire Ctrl+P → « Enregistrer au format PDF ».
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.dirname(__dirname);
const OUT_HTML = path.join(ROOT, 'tools', '_print');
const OUT_PDF = path.join(ROOT, 'assets', 'files');

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
const site = read('site.json');
const products = read('products.json');
const pages = read('pages.json');

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = (o, lang) => (o && typeof o === 'object' && !Array.isArray(o) ? o[lang] : o);

/** Chemin file:// absolu — Chrome headless doit pouvoir lire les images. */
const fileUrl = (webPath) =>
  'file:///' + path.join(ROOT, webPath.replace(/^\//, '')).replace(/\\/g, '/');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const T = {
  fr: {
    title: 'Catalogue produits',
    sub: 'Panneaux · Parquets · Terrasses · Bardages · Lambris · Plinthes',
    intro:
      "Sunikai importe des produits en bois d'Asie pour le marché européen. Sourcing sur mesure, contrôle qualité en usine avant chaque expédition, livraison en Incoterm DAP jusqu'à votre entrepôt.",
    dims: 'Formats disponibles',
    length: 'Longueur', width: 'Largeur', thickness: 'Épaisseur',
    species: 'Matière', quality: 'Caractéristiques', structure: 'Structure', finish: 'Finitions', options: 'Options',
    uses: 'Utilisations',
    onRequest: 'Autres dimensions et formats spéciaux sur demande.',
    services: 'Nos services',
    contact: 'Contact',
    edition: 'Édition',
    footer: 'Les dimensions et qualités indiquées sont nos standards. Toute cotation est établie sur demande, en Incoterm DAP.',
  },
  en: {
    title: 'Product catalogue',
    sub: 'Panels · Flooring · Decking · Cladding · Panelling · Skirting',
    intro:
      'Sunikai imports Asian wood products for the European market. Tailored sourcing, in-factory quality control before every shipment, DAP delivery to your warehouse.',
    dims: 'Available sizes',
    length: 'Length', width: 'Width', thickness: 'Thickness',
    species: 'Material', quality: 'Key features', structure: 'Construction', finish: 'Finishes', options: 'Options',
    uses: 'Applications',
    onRequest: 'Other dimensions and special formats on request.',
    services: 'Our services',
    contact: 'Contact',
    edition: 'Edition',
    footer: 'The dimensions and grades listed are our standards. Every quotation is issued on request, under DAP Incoterm.',
  },
};

function catalogueHtml(lang) {
  const t = T[lang];
  const today = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    month: 'long', year: 'numeric',
  });

  const productPage = (p) => `
<section class="sheet product">
  <div class="ph">
    <span class="cat">${esc(L(p.category, lang))}</span>
    <h2>${esc(L(p.name, lang))}</h2>
    <p class="sub">${esc(L(p.subtitle, lang))}</p>
  </div>
  <img class="shot" src="${fileUrl(p.image)}" alt="">
  <p class="intro">${esc(L(p.intro, lang))}</p>
  <div class="cols">
    <table class="specs">
      <tr><th>${esc(t.species)}</th><td>${esc(L(p.material, lang))}</td></tr>
      <tr><th>${esc(t.quality)}</th><td>${esc((p.features || []).map((f) => L(f, lang)).join(' · '))}</td></tr>
      ${(p.finishes || []).length ? `<tr><th>${esc(t.finish)}</th><td>${esc(p.finishes.map((f) => L(f, lang)).join(' · '))}</td></tr>` : ''}
      ${(p.options || []).length ? `<tr><th>${esc(t.options)}</th><td>${esc(p.options.map((o) => L(o, lang)).join(' · '))}</td></tr>` : ''}
    </table>
    <div>
      <h3>${esc(t.dims)}</h3>
      <table class="dims">
        ${(p.sizes || []).map((g) => `<tr><th>${esc(L(g.label, lang))}</th><td>${esc(g.values.map((v) => L(v, lang)).join(' · ') + (g.unit ? ' ' + g.unit : ''))}${g.note ? `<br><small>${esc(L(g.note, lang))}</small>` : ''}</td></tr>`).join('')}
      </table>
      <h3>${esc(t.uses)}</h3>
      <ul>${L(p.uses, lang).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
  </div>
  <p class="foot">${esc(t.onRequest)}</p>
</section>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>Sunikai — ${esc(t.title)}</title>
<style>
  @page { size: A4; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #23313A; font-size: 10.5pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1, h2, h3 { color: #0B3A47; margin: 0 0 .4em; line-height: 1.15; }
  .sheet { page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }

  /* couverture */
  .cover { display: flex; flex-direction: column; justify-content: space-between; min-height: 258mm; }
  .cover-top { background: #F7B32B; color: #0B3A47; padding: 26mm 16mm; text-align: center; }
  .cover-top .word { font-size: 46pt; font-weight: 800; letter-spacing: .06em; color: #12657A; margin: 0; }
  .cover-top .tag { font-size: 10pt; letter-spacing: .28em; text-transform: uppercase; margin: 6px 0 0; font-weight: 600; }
  .cover h1 { font-size: 26pt; margin-top: 14mm; }
  .cover .sub { font-size: 12pt; color: #12657A; font-weight: 600; letter-spacing: .04em; }
  .cover .intro { max-width: 130mm; margin-top: 8mm; }
  .cover-bottom { border-top: 3px solid #F7B32B; padding-top: 6mm; font-size: 9.5pt; }
  .cover-bottom strong { color: #0B3A47; }

  /* fiche produit */
  .product .ph { border-bottom: 3px solid #F7B32B; padding-bottom: 4mm; margin-bottom: 6mm; }
  .cat { font-size: 8.5pt; letter-spacing: .18em; text-transform: uppercase; color: #C8880A; font-weight: 700; }
  .product h2 { font-size: 21pt; margin: 3px 0 2px; }
  .product .sub { color: #12657A; font-weight: 600; margin: 0; }
  .shot { width: 100%; height: 72mm; object-fit: cover; border-radius: 3mm; display: block; }
  .intro { margin: 6mm 0; font-size: 11pt; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  h3 { font-size: 9.5pt; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 2mm; }
  h3 + table, h3 + ul { margin-bottom: 5mm; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 2.2mm 0; border-bottom: .3mm solid #E6DFD3; font-size: 9.5pt; }
  th { width: 32mm; color: #6B7A84; font-weight: 600; text-transform: uppercase; font-size: 8pt; letter-spacing: .07em; }
  ul { margin: 0; padding-left: 4.5mm; }
  li { margin-bottom: 1mm; }
  .foot { margin-top: 6mm; font-size: 9pt; color: #6B7A84; font-style: italic; }

  /* page services / contact */
  .svc { margin-bottom: 8mm; }
  .svc h3 { font-size: 12pt; text-transform: none; letter-spacing: 0; color: #0B3A47; }
  .contact-box { background: #FBF7F0; border: .3mm solid #E6DFD3; border-radius: 3mm; padding: 6mm; margin-top: 6mm; }
  .contact-box p { margin: 0 0 3mm; }
  .legal { margin-top: 10mm; font-size: 8.5pt; color: #6B7A84; }
</style>
</head>
<body>

<section class="sheet cover">
  <div>
    <div class="cover-top">
      <p class="word">SUNIKAI</p>
      <p class="tag">sourcing · import · export</p>
    </div>
    <h1>${esc(t.title)}</h1>
    <p class="sub">${esc(t.sub)}</p>
    <p class="intro">${esc(t.intro)}</p>
  </div>
  <div class="cover-bottom">
    <p><strong>${esc(t.edition)} ${esc(today)}</strong> — sunikai.com</p>
    ${site.contacts
      .map(
        (c) =>
          `<p><strong>${esc(c.name)}</strong> · ${esc(L(c.role, lang))}${c.phone ? ' · ' + esc(c.phone) : ''}${c.email ? ' · ' + esc(c.email) : ''}</p>`
      )
      .join('')}
  </div>
</section>

${products.map(productPage).join('')}

<section class="sheet">
  <h2>${esc(t.services)}</h2>
  ${pages.services
    .map(
      (s) => `
  <div class="svc">
    <h3>${esc(L(s.title, lang))}</h3>
    <p>${esc(L(s.short, lang))}</p>
    <ul>${L(s.points, lang).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>`
    )
    .join('')}
  <div class="contact-box">
    <h3>${esc(t.contact)}</h3>
    ${site.contacts
      .map(
        (c) =>
          `<p><strong>${esc(c.name)}</strong> — ${esc(L(c.role, lang))}<br>${c.phone ? esc(c.phone) + '<br>' : ''}${c.email ? esc(c.email) : ''}</p>`
      )
      .join('')}
    <p>sunikai.com</p>
  </div>
  <p class="legal">${esc(t.footer)}</p>
</section>

</body>
</html>
`;
}

function findChrome() {
  return CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
}

function run() {
  fs.mkdirSync(OUT_HTML, { recursive: true });
  fs.mkdirSync(OUT_PDF, { recursive: true });

  const chrome = findChrome();
  const results = [];

  for (const lang of ['fr', 'en']) {
    const html = path.join(OUT_HTML, `catalogue-${lang}.html`);
    fs.writeFileSync(html, catalogueHtml(lang), 'utf8');

    const pdf = path.join(OUT_PDF, `catalogue-sunikai-${lang}.pdf`);
    if (!chrome) { results.push([lang, null, html]); continue; }

    try {
      execFileSync(
        chrome,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          `--user-data-dir=${path.join(OUT_HTML, '_chrome-' + lang)}`,
          '--run-all-compositor-stages-before-draw',
          '--virtual-time-budget=8000',
          '--no-pdf-header-footer',
          `--print-to-pdf=${pdf}`,
          'file:///' + html.replace(/\\/g, '/'),
        ],
        { stdio: 'pipe', timeout: 120000 }
      );
      results.push([lang, fs.existsSync(pdf) ? pdf : null, html]);
    } catch (e) {
      results.push([lang, fs.existsSync(pdf) ? pdf : null, html]);
    }
  }

  for (const [lang, pdf, html] of results) {
    if (pdf) {
      console.log(`✓ catalogue ${lang.toUpperCase()} → ${path.relative(ROOT, pdf)} (${Math.round(fs.statSync(pdf).size / 1024)} Ko)`);
    } else {
      console.log(`! catalogue ${lang.toUpperCase()} : PDF non généré. Ouvrir ${path.relative(ROOT, html)} et faire Ctrl+P → PDF.`);
    }
  }
  if (!chrome) console.log('\nChrome/Edge introuvable. Définir CHROME_PATH pour automatiser.');
}

run();
