# florian-etourneau.dev

Site personnel de Florian Etourneau : une page, une nuée d’étourneaux, un panier de basket.
Construit avec [Astro](https://astro.build), sans framework côté client.

## Démarrer

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # génère dist/
npm run preview   # sert dist/ en local
```

Node 22.12 ou plus récent.

## Organisation

```
public/favicon/            icônes et manifest
public/icons/              logos officiels GitHub et LinkedIn (menu mobile)
src/
  layouts/Base.astro       <head>, polices, favicon, thème mémorisé
  components/
    Entete.astro           logo, liens, bascule de thème
    Accueil.astro          accroche + scène du tir
    Maintenant.astro       les étapes sur lesquelles la nuée se pose
    Parcours.astro         liste générée depuis src/data/parcours.ts
    Pied.astro             contact, heure et météo, la famille sur le fil
  data/parcours.ts         postes et durées (un oiseau = deux mois)
  scripts/
    nuee.js                la nuée (canvas fixe, coordonnées document)
    formes.js              les formes que dessine la nuée et leur échantillonnage
    theme.js               la bascule de thème
    site.js                chorégraphie de la nuée, tir, envol, heure, famille, copier
    air-ball.js            l’animation de la page 404
  styles/
    tokens.css             copie des tokens de la charte — ne pas modifier ici
    global.css             styles du site, uniquement à partir des tokens
  pages/index.astro        assemble la page
  pages/404.astro          « Air ball » : la page introuvable
outils/copier-tokens.mjs   (local, hors git) recopie tokens.css depuis ../etourneau-identite
```

Les scripts sont des modules ES bundlés par Astro ; ils ciblent les éléments par `id`,
donc garder les `id` des composants en cas de modification.

La charte (dossier voisin `etourneau-identite`) est la source des couleurs, tailles et polices :
aucune couleur en dur dans le site, tout passe par `--fe-*`. Après un changement de tokens
côté charte, lancer `node outils/copier-tokens.mjs` (outil local, hors git : il lit le dossier voisin).

## Déploiement

Vercel (preset Astro détecté automatiquement) : chaque push sur `main` part en production,
chaque branche a sa preview. Domaine : `florian-etourneau.dev`.

## À faire

- Image de partage `og:image` (1200×630).
- Adresse de contact sur le domaine une fois le mail configuré.
