# Site Sunikai — sunikai.com

Site vitrine bilingue (FR / EN) de Sunikai : import de produits en bois d'Asie
pour le marché européen. **HTML / CSS / JS statique, zéro dépendance, zéro
framework.** Hébergé gratuitement sur GitHub Pages.

---

## 1. Ce qu'il faut savoir en 30 secondes

- **Le contenu se modifie dans `content/*.json`**, jamais dans les fichiers
  `.html` : ils sont **régénérés et écrasés** à chaque `node build.js`.
- Après toute modification : `node build.js`, puis `git add . && git commit && git push`.
  Le site est en ligne 1 à 2 minutes plus tard.
- Pour voir le résultat avant de publier : `node serve.js` → <http://localhost:4321>

```bash
node build.js
```

---

## 2. Structure

```
sunikai-site/
├── content/                  ← LE CONTENU (c'est ici qu'on travaille)
│   ├── site.json             textes d'interface, contacts, tous les libellés FR/EN
│   ├── products.json         les 11 produits (specs, dimensions, descriptions)
│   ├── pages.json            services, arguments « pourquoi nous », à propos, chiffres
│   └── news.json             articles d'actualité
│
├── assets/
│   ├── css/style.css         toute la mise en forme (un seul fichier)
│   ├── js/main.js            menu mobile, filtres produits, envoi du formulaire
│   ├── img/                  photos optimisées + variantes -sm (générées)
│   │   └── _originals/       photos d'origine, non publiées (ne pas supprimer)
│   └── files/                catalogues PDF générés
│
├── tools/
│   ├── optimize-images.py    redimensionne et compresse les photos
│   └── make-catalogue.js     génère les catalogues PDF FR + EN
│
├── build.js                  le générateur (produit les 42 pages HTML)
├── serve.js                  serveur local de prévisualisation
├── CNAME                     le nom de domaine (généré depuis content/site.json)
│
└── [pages générées]          index.html, produits/, services/, en/, sitemap.xml…
```

---

## 3. Les gestes courants

### Modifier un texte

Ouvrir le `.json` concerné, changer la valeur, relancer `node build.js`.
Chaque texte existe en deux versions :

```json
"title": { "fr": "Panneau Hévéa", "en": "Rubberwood Panel" }
```

### Ajouter un produit

1. Déposer la photo dans `assets/img/products/mon-produit.jpg`
2. Lancer `python tools/optimize-images.py` (crée la version allégée + la variante `-sm`)
3. Copier un bloc existant dans `content/products.json` et l'adapter.
   Champs obligatoires : `id`, `slug.fr`, `slug.en`, `image`, `category`, `name`,
   `subtitle`, `specs`, `dims`, `intro`, `body`, `uses`.
4. `node build.js` — la fiche, le catalogue, le menu déroulant du formulaire et
   le plan de site se mettent à jour tout seuls.

> Le `slug` est l'adresse de la page (`/produits/<slug.fr>/`). Une fois le site
> référencé par Google, **ne plus le changer** : ça casse le lien.

### Ajouter un article d'actualité

Copier un bloc de `content/news.json`. Le champ `body` accepte du HTML simple
(`<p>`, `<h2>`, `<ul>`, `<strong>`). La date au format `AAAA-MM-JJ` sert au tri.

### Changer une photo

Remplacer le fichier dans `assets/img/`, puis :

```bash
python tools/optimize-images.py
node build.js
```

Attention : l'optimiseur garde une copie d'origine dans `assets/img/_originals/`.
Si vous remplacez une photo, **supprimez d'abord son ancienne copie** dans
`_originals/`, sinon l'ancienne version sera réutilisée.

### Régénérer les catalogues PDF

```bash
node tools/make-catalogue.js
```

Utilise Chrome en mode invisible. Si Chrome est introuvable, le script laisse
le HTML dans `tools/_print/` : l'ouvrir et faire Ctrl+P → « Enregistrer au format PDF ».

---

## 4. Le formulaire de contact — à activer

GitHub Pages ne sert que des fichiers statiques : il ne peut pas envoyer d'email.
Le formulaire a donc besoin d'un **endpoint** — une URL qui reçoit la soumission
et te la transmet par mail.

Le site ne dépend d'aucun prestataire en particulier : l'URL vit dans un seul
champ, `formEndpoint` de `content/site.json`. En changer, c'est une ligne.

```json
"formEndpoint": "A_CONFIGURER"
```

Tant que la valeur vaut `A_CONFIGURER`, la page contact affiche un bandeau, le
bouton d'envoi est désactivé et le visiteur est renvoyé vers l'email direct.

### Option A — un service de formulaire (5 minutes)

| Service | Gratuit | Compte requis |
|---|---|---|
| **Web3Forms** | ~250 envois/mois | non, une clé par email |
| **Formspree** | ~50 envois/mois | oui |
| **Basin** | essai puis payant | oui |

Coller l'URL fournie dans `formEndpoint`, lancer `node build.js`, pousser.
Le JS envoie déjà en `fetch` avec `Accept: application/json` — le format
attendu par ces trois services.

*Vérifier les quotas gratuits sur le site du prestataire : ils changent.*

### Option B — ton propre endpoint (autonomie complète)

Un Cloudflare Worker (ou une petite fonction serverless) qui reçoit le POST et
relaie par email. Nécessite un plan Workers payant (~5 $/mois) et un service
d'envoi. À faire seulement après la migration DNS vers Cloudflare.

⚠️ **Cloudflare Email Routing prend la main sur les MX du domaine.** Ne jamais
l'activer sur `sunikai.com` sans avoir vérifié l'impact sur Google Workspace :
`vincent@sunikai.com` en dépend.

## 5. Mise en ligne — GitHub Pages + sunikai.com

### 5.1 Créer le dépôt

```bash
gh repo create sunikai-site --public --source=. --push
```

ou, sans la CLI GitHub : créer un dépôt vide sur github.com puis

```bash
git remote add origin https://github.com/<votre-compte>/sunikai-site.git
git branch -M main
git push -u origin main
```

### 5.2 Activer Pages

Dans le dépôt : **Settings → Pages**
- Source : *Deploy from a branch*
- Branch : `main`, dossier `/ (root)`
- Custom domain : `sunikai.com` → **Save**
- Cocher **Enforce HTTPS** une fois le certificat émis (quelques minutes)

Le fichier `CNAME` est déjà présent à la racine : GitHub le lit automatiquement.

### 5.3 DNS — ⚠️ NE PAS TOUCHER AUX ENREGISTREMENTS MX

La zone DNS de `sunikai.com` est hébergée chez Google Cloud DNS
(`ns-cloud-c1..c4.googledomains.com`), et l'email `vincent@sunikai.com` dépend
de l'enregistrement `MX → smtp.google.com`. **Ne modifier que les
enregistrements A / AAAA / CNAME du site.**

Enregistrements à créer (remplacer ceux qui pointent vers Squarespace) :

| Type  | Nom / Hôte | Valeur |
|-------|-----------|--------|
| A     | `@`       | `185.199.108.153` |
| A     | `@`       | `185.199.109.153` |
| A     | `@`       | `185.199.110.153` |
| A     | `@`       | `185.199.111.153` |
| AAAA  | `@`       | `2606:50c0:8000::153` |
| AAAA  | `@`       | `2606:50c0:8001::153` |
| AAAA  | `@`       | `2606:50c0:8002::153` |
| AAAA  | `@`       | `2606:50c0:8003::153` |
| CNAME | `www`     | `<votre-compte>.github.io.` |

Vérifier ces adresses sur la page officielle avant de les saisir :
<https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>

Vérification après propagation (10 min à 2 h) :

```bash
nslookup sunikai.com 8.8.8.8
nslookup -type=MX sunikai.com 8.8.8.8   # doit toujours répondre smtp.google.com
```

### 5.4 Référencement

Une fois le site en ligne :
- Déclarer le site dans **Google Search Console** et y soumettre
  `https://sunikai.com/sitemap.xml`
- Créer une fiche **Google Business Profile** si l'activité a une adresse publique
- L'ancien site `sunikai.onepage.me` peut être fermé ; s'il a des liens entrants,
  y placer d'abord une redirection vers `sunikai.com`

---

## 6. Points à compléter

- [ ] **Mentions légales** : forme juridique, siège, RCS, TVA, directeur de
      publication — voir `build.js`, fonction `legalPage()` (mention « À compléter »)
- [ ] **Endpoint du formulaire** : URL à coller dans `formEndpoint` (`content/site.json`)
- [ ] **Certifications PEFC / FSC** : vérifier ce qui est réellement certifié et
      sur quelles essences, pour ne rien annoncer de trop large
- [ ] **Email de Frédéric Gachon** : absent de l'ancien site, à ajouter dans
      `content/site.json` si souhaité
- [ ] **Photo d'équipe / d'usine** : les visuels services sont génériques,
      des photos réelles auraient plus d'impact
- [ ] **Article EUDR** (règlement européen déforestation) : sujet à fort trafic
      pour un importateur de bois, à écrire une fois les échéances vérifiées

---

## 7. Dépannage

**Le site ne change pas après un push** — GitHub Pages met 1 à 2 minutes.
Vérifier l'onglet *Actions* du dépôt, puis vider le cache du navigateur (Ctrl+F5).

**Une page renvoie 404** — le dossier n'a pas été committé. `git status` puis
`git add .`. Vérifier aussi que `.nojekyll` est bien présent à la racine.

**Les images ne s'affichent pas** — chemins sensibles à la casse sur GitHub Pages
(`Panneau.JPG` ≠ `panneau.jpg`), contrairement à Windows.

**`node` introuvable** — installer Node.js LTS depuis <https://nodejs.org>.

**`Pillow manquant`** — `python -m pip install Pillow`
