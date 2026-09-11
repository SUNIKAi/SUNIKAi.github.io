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
- `content/products.json` — 15 produits (catalogue refondu le 2026-09-11 depuis
  `Desktop/BUSINESS` : fiches techniques 2026, fiche vendeur France, liste de prix
  bambou). Modèle : `material`, `features[]` (points clés), `sizes[]` (`label`,
  `unit`, `values[]` en chaînes ou `{fr,en}`, `note`), `finishes[]`
  (`{fr,en,swatch}`), `options[]`, `intro`, `body`, `uses`. Rendu en pastilles
  par `optionsBlock()` et `sizesSummary()` dans build.js. Le user veut des
  **tailles en options** (pas un format unique figé).
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

- **Formulaire de devis actif via Web3Forms** (2026-09-11) : `formEndpoint` =
  `https://api.web3forms.com/submit`, `formAccessKey` = clé du compte
  `vincent@sunikai.com` (clé publique par conception, OK dans le dépôt).
  Champs cachés Web3Forms : `access_key`, `subject`, `from_name`, honeypot
  `botcheck`. Si `formAccessKey` est vide, build.js retombe sur les champs
  style Formspree (`_subject`, `_gotcha`).
- ⚠️ Cloudflare Email Routing prend la main sur les MX : ne jamais l'activer sur
  `sunikai.com` sans vérifier l'impact sur Google Workspace.
- Mentions légales : ligne « À compléter » retirée (2026-09-11). Société basée
  à Hong Kong → pas de RCS/TVA français. Page conservée pour la section
  « Données personnelles » (formulaire, clients UE). Ne pas mentionner Hong
  Kong sur le site sans demande explicite du user.
- **EN LIGNE sur https://sunikai.com depuis le 2026-09-09.**
  Dépôt `SUNIKAi/SUNIKAi.github.io`, `brand.customDomainActive` = `true`,
  CNAME généré. 30/30 URLs en 200, certificat HTTPS valide, `www` redirige
  vers l'apex. `sunikai.github.io` redirige vers `sunikai.com`.
  **Enforce HTTPS activé** (2026-09-11) : http:// et www redirigent en 301
  vers https://sunikai.com.
- **Zone DNS finale** (Squarespace, NS Google Cloud DNS) : 4 A + 4 AAAA vers
  GitHub Pages sur `@`, CNAME `www` -> `sunikai.github.io`, plus les 3
  enregistrements Google Workspace laissés intacts (MX `smtp.google.com`,
  TXT SPF, TXT `google._domainkey`). Le bloc « Valeurs par défaut de
  Squarespace » a été supprimé.
- Piège observé : le panneau Squarespace met ~20 min à publier ses
  changements vers les serveurs de noms. Ne pas conclure à un échec avant.
- **Google Search Console validée** (2026-09-11) pour la propriété
  `https://sunikai.com/`, compte `v.bergeron000@gmail.com`, méthode balise
  HTML. ⚠️ **Ne jamais vider `brand.googleSiteVerification`** dans
  `content/site.json` : sans la balise, Google retire la validation.
  Astuce : le dialogue « Ajouter un site Web » de GSC se ferme tout seul en
  automatisation ; passer par l'URL directe
  `search-console/ownership?resource_id=https%3A%2F%2Fsunikai.com%2F`.
- Le user pousse avec **GitHub Desktop** (ses identifiants y sont stockés).
  La ligne de commande n'a pas d'identifiants GitHub sur cette machine :
  ne pas tenter `git push` depuis une session Claude, lui demander de pousser.
- Idées : article sur le règlement EUDR, photos réelles d'usine/équipe,
  page « références / réalisations ».

## Historique

- **2026-09-11 — refonte du catalogue.** 15 produits, formats en pastilles,
  bambou vertical en 2 produits (naturel / caramel), parquets hévéa fusionnés,
  parquets bambou fusionnés, terrasse réversible + GRAD fusionnées, 3 plinthes.
  Retirés : parquet acacia, placage bambou, panneau bambou noir. Plinthes en
  **paulownia** (confirmé par le user). **Garantie terrasse volontairement
  non affichée** (choix du user). Photo de la lame box chevaux
  provisoire (bambou densifié). Ne jamais publier prix, clients ni fournisseurs.
- **2026-09-09 — mise en ligne.** Dépôt `SUNIKAi.github.io` créé (nom imposé :
  les liens du site sont absolus, un dépôt projet servi sur un sous-chemin
  casserait tout). CNAME rendu conditionnel. Site vérifié en production.
- **2026-09-02 — création.** Contenu et photos récupérés de l'ancien site
  onepage. 11 fiches produit, 3 services, 3 articles, catalogues PDF FR/EN,
  formulaire de devis, SEO (sitemap, hreflang, JSON-LD, OpenGraph).
