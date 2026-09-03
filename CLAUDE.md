# Sunikai — site web (documentation Claude Code)

> Lu automatiquement au démarrage. Le mode d'emploi destiné à l'humain est dans
> `README.md` ; ce fichier note les règles et pièges du projet.

## Nature du projet

Site vitrine bilingue FR/EN de **Sunikai** (import de bois d'Asie vers l'Europe :
panneaux, parquets, terrasses, placages, bardages en hévéa, acacia, bambou).
Remplace l'ancien site <https://sunikai.onepage.me/>.

Domaine : **sunikai.com** — hébergement cible **GitHub Pages**.

## Règles absolues

1. **Ne jamais éditer les `.html` générés.** Ils sont écrasés par `node build.js`.
   Toute modification de contenu passe par `content/*.json` ; toute modification
   de structure passe par `build.js`.
2. **Ne jamais toucher aux enregistrements MX de sunikai.com.** L'email
   `vincent@sunikai.com` est sur Google Workspace (`MX → smtp.google.com`), zone
   DNS chez Google Cloud DNS (`ns-cloud-c1..c4.googledomains.com`). Seuls les
   A / AAAA / CNAME du site sont à modifier.
3. **Aucune dépendance npm.** Le projet est volontairement en HTML/CSS/JS pur,
   généré par un script Node sans `package.json`. Ne pas introduire de framework,
   de bundler ni de librairie CDN sans demander.
4. **Ne pas inventer de données commerciales.** Certifications, tolérances,
   densités, délais, références clients : si l'information n'est pas dans
   `content/`, la demander plutôt que de la déduire.
5. **Ne pas changer un `slug` de produit déjà publié** — ça casse le
   référencement et les liens existants.

## Commandes

```bash
node build.js                    # génère les 42 pages + sitemap + robots + CNAME
node serve.js                    # prévisualisation sur http://localhost:4321
python tools/optimize-images.py  # redimensionne les photos + variantes -sm
node tools/make-catalogue.js     # catalogues PDF FR + EN (via Chrome headless)
```

## Architecture

- `build.js` — générateur unique. Contient les routes (`ROUTES`), le `layout()`
  (SEO, hreflang, JSON-LD), les composants (`productCard`, `ctaBand`, `img`…) et
  une fonction par type de page.
- `content/site.json` — libellés d'interface FR/EN, contacts, `formEndpoint`
  (URL du formulaire, prestataire au choix).
- `content/products.json` — 11 produits, tous les champs en `{fr, en}`.
- `content/pages.json` — services, arguments « pourquoi nous », à propos, chiffres.
- `content/news.json` — articles ; `body` accepte du HTML simple.
- `assets/css/style.css` — feuille unique, tokens CSS en `:root`.
- `assets/js/main.js` — menu mobile, filtres catalogue, envoi AJAX du formulaire.

### Routes

| Clé | FR | EN |
|---|---|---|
| home | `/` | `/en/` |
| products | `/produits/` | `/en/products/` |
| services | `/services/` | `/en/services/` |
| about | `/a-propos/` | `/en/about/` |
| news | `/actualites/` | `/en/news/` |
| contact | `/contact/` | `/en/contact/` |
| legal | `/mentions-legales/` | `/en/legal-notice/` |

Fiches produit : `/produits/<slug.fr>/` et `/en/products/<slug.en>/`.

## Images

`tools/optimize-images.py` archive l'original dans `assets/img/_originals/`
(ignoré par Git) puis produit deux fichiers : `nom.jpg` (1200 px, q72) et
`nom-sm.jpg` (600 px, q70). Le helper `img()` de `build.js` émet le `srcset`
automatiquement quand la variante `-sm` existe.

⚠️ Remplacer une photo suppose de **supprimer d'abord sa copie dans
`_originals/`**, sinon l'ancienne version est réutilisée.

## Charte graphique

Reprise du logo d'origine.

| Rôle | Valeur |
|---|---|
| Teal (marque) | `#12657A` |
| Teal foncé (fonds, footer) | `#08303C` / `#0D4B5C` |
| Ambre (accent, CTA) | `#F7B32B` |
| Sable (fonds alternés) | `#FBF7F0` |
| Encre (titres) | `#14202A` |

Polices : **Archivo** (titres, boutons, UI) + **Inter** (texte courant), via
Google Fonts.

## État / reste à faire

- Formulaire de contact : `formEndpoint` vaut encore `A_CONFIGURER` dans
  `content/site.json` → bandeau affiché, bouton d'envoi désactivé. Le champ est
  volontairement neutre (Web3Forms, Formspree, Worker maison… au choix).
- ⚠️ Cloudflare Email Routing prend la main sur les MX : ne jamais l'activer sur
  `sunikai.com` sans vérifier l'impact sur Google Workspace.
- Mentions légales incomplètes (forme juridique, RCS, TVA) — voir `legalPage()`.
- Pas encore poussé sur GitHub ni branché sur le domaine.
- Idées : article sur le règlement EUDR, photos réelles d'usine/équipe,
  page « références / réalisations ».

## Historique

- **2026-09-02 — création.** Contenu et photos récupérés de l'ancien site
  onepage. 11 fiches produit, 3 services, 3 articles, catalogues PDF FR/EN,
  formulaire de devis, SEO (sitemap, hreflang, JSON-LD, OpenGraph).
