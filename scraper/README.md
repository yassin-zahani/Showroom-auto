# Showroom scraper : le « mini backend » du showroom Angular

Petit serveur Node.js (sans framework, 2 dépendances : `htmlparser2` et `css-select`) qui récupère
des prix sur le web, calcule des **statistiques** et les sert à ton application Angular.

```
Navigateur ─► Angular (:4200) ─/api/market─► Proxy ng serve ─► Ce serveur (:3000) ─► Cache 6 h ─► Une « source »
                                                                                                    ├─ mock          (démo, défaut)
                                                                                                    ├─ books-demo    (site d'entraînement)
                                                                                                    ├─ automobile-tn (parseur dédié)
                                                                                                    └─ ta-source     (sources.config.json)
```

**Pourquoi un backend ?** Le navigateur applique la règle CORS : Angular ne peut pas lire une page
d'un autre domaine. Un serveur, lui, n'est pas soumis à CORS. Et c'est lui, **seul**, qui contacte les
sites, avec cache, respect de `robots.txt` et délai entre requêtes, quel que soit le nombre de visiteurs.

## Démarrer en 3 commandes (mode démo)

```bash
cd scraper
npm install
npm start            # → http://localhost:3000
```
Puis, à la racine du projet Angular : `ng serve` (redémarre-le si tu viens d'ajouter `proxy.conf.json`).

## Activer le VRAI scraping : 3 niveaux

### Niveau 1 : l'exemple d'entraînement (`books-demo`), sans aucun risque
`books.toscrape.com` est un site **fait exprès pour apprendre à scraper**. On y lit de vraies pages,
de vrais prix (de livres, en £), avec exactement la même technique que sur un site de voitures.

```bash
cp .env.example .env          # Windows : copy .env.example .env
# ouvre .env et mets :  SCRAPER_SOURCE=books-demo
npm run start:env
```
(Sans fichier `.env`, en PowerShell : `$env:SCRAPER_SOURCE="books-demo"; npm start`
— en cmd : `set SCRAPER_SOURCE=books-demo && npm start`.)

Ouvre une voiture dans Angular : l'encart **Market check** affiche maintenant la médiane des prix de
livres **en £**, sans pourcentage d'écart (on ne compare pas des livres en £ à une voiture en DT).
La console du serveur affiche `LIVE: books.toscrape.com will be contacted politely…`.

### Niveau 2 : ton propre site, d'un autre pays (exemple de configuration)
Aucun code à écrire : tu **décris** le site dans `sources.config.json`. Copie le bloc `_template-your-site`,
renomme-le (sans le `_`), puis remplis-le :

| Champ | Rôle | Exemple |
|---|---|---|
| `urlTemplate` | URL de la page de résultats. `{query}`, `{brand}`, `{model}`, `{page}` sont remplacés | `https://site.fr/voitures?q={query}&page={page}` |
| `item` | sélecteur CSS d'**une** annonce | `.annonce` |
| `price` | sélecteur CSS du prix, **dans** l'annonce | `.annonce-prix` |
| `title`, `link` | facultatifs ; `{ "selector": "a", "attr": "href" }` pour lire un attribut | |
| `year` | facultatif : active le filtre « annonces récentes » | `.annonce-annee` |
| `currency` | devise des prix (`EUR`, `GBP`, `USD`, `MAD`…) | `EUR` |
| `priceBounds` | `[min, max]` vraisemblables dans cette devise | `[500, 500000]` |
| `requiresOptIn` | `true` si le site a des conditions d'utilisation à respecter | `true` |

**Trouver les sélecteurs** : ouvre la page de résultats, clic droit sur le prix → *Inspecter*. Dans la
console du navigateur, teste : `document.querySelectorAll('.annonce').length` doit donner le nombre
d'annonces visibles, et `document.querySelector('.annonce .annonce-prix').textContent` un prix.
Puis `SCRAPER_SOURCE=ton-nom` et relance le serveur. Les prix `£51.77`, `1 234,50 €`, `$12,345`,
`138 000 DT` sont tous compris automatiquement.

⚠ Les sites rendus **par JavaScript** (le HTML initial est vide, les annonces arrivent après) ne
fonctionnent pas avec cette méthode : il faudrait un navigateur automatisé (Playwright) ou, mieux,
l'API officielle du site si elle existe.

### Niveau 3 : automobile.tn (marché tunisien)
Parseur dédié, **avec garde-fou** : `SCRAPER_SOURCE=automobile-tn` **et** `ALLOW_LIVE_SCRAPING=yes`.

## ⚠️ Cadre légal : à lire avant de scraper un vrai site

Ce que j'ai lu le 24/10/2026 (je ne suis pas juriste, vérifie par toi-même) :

- **automobile.tn**, *Mentions légales* : contenu consultable « à vos fins personnelles et non
  commerciales » ; interdit de le reproduire, l'afficher en public ou le distribuer.
- **tayara.tn**, *Conditions d'utilisation* : informations utilisables uniquement « dans le cadre d'une
  utilisation normale du site ». Il n'est volontairement **pas** branché ici.
- **books.toscrape.com** : site d'entraînement qui invite explicitement au scraping.

Pour apprendre, sur ta machine, c'est raisonnable. Pour un showroom **public ou commercial**, demande
l'autorisation écrite de l'éditeur (ou un flux officiel) avant de publier quoi que ce soit.
Garde-fous intégrés : `robots.txt` lu et respecté (refus s'il est illisible) · 2 s minimum entre deux
requêtes · 3 pages maximum par recherche · cache 6 h · jamais de données personnelles.

## API

| Route | Réponse |
|---|---|
| `GET /api/health` | `{ "status": "ok", "source": "mock" }` |
| `GET /api/market?brand=Audi&model=Q5[&minYear=2024]` | `{ source, sourceUrl, mode, currency, comparable, note, brand, model, minYear, count, min, median, max, fetchedAt, cached }` |

L'API ne renvoie **que des chiffres agrégés et un lien**, jamais le texte des annonces ni les vendeurs.
`comparable` vaut `true` seulement si la devise est le dinar : c'est lui qui autorise Angular à afficher
l'écart en % avec le prix du showroom.

## Dépannage
- **« The market service is not reachable right now »** dans Angular : le scraper n'est pas lancé, ou le
  proxy n'est pas actif. Teste `http://localhost:3000/api/health` puis `http://localhost:4200/api/health` :
  les deux doivent répondre `{"status":"ok",…}`. Sinon : `npm start` dans `scraper/`, vérifie que
  `angular.json` contient `"proxyConfig": "proxy.conf.json"` dans `serve`, puis **redémarre `ng serve`**.
- **Même message avec une source live** : le site a refusé (robots.txt), est injoignable, ou a changé de
  structure. Regarde le terminal du scraper : il écrit la raison exacte.
- **« Unknown SCRAPER_SOURCE »** : le nom ne correspond à aucune clé de `sources.config.json`.

## Tests
```bash
npm test      # 43 tests : prix de tous pays, médiane, robots.txt, cache, parseurs, bout en bout sans Internet, API, CORS
```

## En production
Sers Angular et `/api` depuis le **même domaine** (nginx : `location /api/ { proxy_pass http://127.0.0.1:3000; }`).
Sinon, mets l'URL de ton site dans `ALLOWED_ORIGIN`.
