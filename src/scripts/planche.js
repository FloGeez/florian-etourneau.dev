/* La planche de l’étape etourneau, comme sur la page de la marque : l’oiseau dessiné en grand dans la scène, et la légende
   de l’étape. Chaque partie est un paquet ; la choisir la fait bouger : la silhouette se dessine
   (brand), le plumage prend ses couleurs (tokens), l’aile se lève autour de l’épaule (starling), et la nuée du site quitte
   la branche pour prendre la forme de l’oiseau (murmuration). Où se pose la nuée : scenes.js, par points() et variante(). */
import { wing, wingOverlayOpacity, easings, animate } from '@etourneau/starling';
import { shapes, sampleShape } from '@etourneau/murmuration';
import { brancheY, surPlanche } from './planche-geometrie.js';

const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initPlanche() {
  const planche = document.querySelector('.planche');
  const etape = document.querySelector('.etape[data-forme="etourneau"]');
  const dessin = planche.querySelector('.planche-dessin');
  const ailes = [...planche.querySelectorAll('.planche-aile')], dessus = planche.querySelector('.planche-aile-dessus');
  const boutons = [...etape.querySelectorAll('.planche-partie')];
  const legende = etape.querySelector('.planche-legende'), pilule = legende.querySelector('.planche-pilule'), fiches = [...etape.querySelectorAll('.planche-fiche')];
  let quandChange = () => {};

  // le fond glisse sous la tuile choisie ; il apparaît d’un coup sur sa première tuile, et se recale sans glisser (redimensionnement)
  const placerPilule = (instant = false) => {
    const b = boutons.find((x) => x.dataset.part === partie);
    if (!b) { pilule.style.opacity = '0'; return; }
    const sansGlisser = instant || pilule.style.opacity !== '1';
    pilule.classList.toggle('instant', sansGlisser);
    Object.assign(pilule.style, { transform: `translate(${b.offsetLeft}px, ${b.offsetTop}px)`, width: `${b.offsetWidth}px`, height: `${b.offsetHeight}px`, opacity: '1' });
    if (sansGlisser) requestAnimationFrame(() => requestAnimationFrame(() => pilule.classList.remove('instant')));
  };
  new ResizeObserver(() => placerPilule(true)).observe(legende);

  // sur petit écran, la planche passe au-dessus de l’étape, à la place réservée à la scène
  const petit = matchMedia('(max-width: 860px)');
  const placer = () => (petit.matches ? etape.querySelector('.etape-scene') : document.querySelector('.scene-nuee')).append(planche);
  placer(); petit.addEventListener('change', placer);

  // l’aile monte ou redescend depuis là où elle en est
  let levee = 0, cible = 0, enCours = false;
  const dessinerAile = () => { const d = wing(easings.overshoot(levee)); ailes.forEach((a) => a.setAttribute('d', d)); dessus.setAttribute('opacity', wingOverlayOpacity(levee).toFixed(3)); };
  const leverAile = (vers) => {
    cible = vers;
    if (reduit) { levee = vers; dessinerAile(); return; }
    if (enCours) return; enCours = true;
    animate((dt) => { levee += Math.sign(cible - levee) * Math.min(Math.abs(cible - levee), dt / 0.45); dessinerAile(); if (levee === cible) { enCours = false; return false; } });
  };

  // à chaque arrivée sur l’étape : la nuée dessine d’abord l’oiseau (dessin caché), puis s’évapore pendant que la silhouette
  // se trace et que les couleurs reviennent ; en partant, la planche s’efface et se remet à zéro pour la prochaine fois
  let partie = '', nuee = false, relais = 0, remise = 0;
  const arriver = () => {
    clearTimeout(remise);
    if (partie) return; // revenu avant la fin du fondu : la planche est restée telle quelle
    if (reduit) { choisir('brand'); return; }
    nuee = true; planche.dataset.arrivee = 'nuee'; quandChange();
    relais = setTimeout(() => { nuee = false; planche.dataset.arrivee = 'dessin'; choisir('brand', true); }, 1900);
  };
  const partir = () => {
    clearTimeout(relais);
    remise = setTimeout(() => {
      nuee = false; partie = ''; delete planche.dataset.arrivee; planche.dataset.part = '';
      boutons.forEach((b) => b.setAttribute('aria-pressed', false)); levee = cible = 0; dessinerAile(); placerPilule();
    }, 500);
  };
  const choisir = (nom, depuisLaNuee = false) => {
    if (nom === partie) return;
    if (!depuisLaNuee) { clearTimeout(relais); nuee = false; delete planche.dataset.arrivee; }
    partie = nom;
    planche.dataset.part = nom;
    boutons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.part === nom));
    fiches.forEach((f) => f.classList.toggle('active', f.dataset.part === nom));
    placerPilule();
    leverAile(nom === 'starling' ? 1 : 0);
    quandChange();
  };
  boutons.forEach((b) => b.addEventListener('click', () => choisir(b.dataset.part)));
  // ← → passent d’une partie à l’autre, le focus suit
  legende.addEventListener('keydown', (e) => {
    const i = boutons.findIndex((b) => b.dataset.part === partie), vers = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1 }[e.key];
    if (vers == null) return;
    e.preventDefault();
    const b = boutons[(vers + boutons.length) % boutons.length];
    choisir(b.dataset.part); b.focus();
  });
  dessinerAile();
  let actif = false;
  new MutationObserver(() => { const a = etape.classList.contains('actif'); if (a !== actif) { actif = a; (a ? arriver : partir)(); } })
    .observe(etape, { attributes: true, attributeFilter: ['class'] });

  // des unités de la planche aux points de la nuée, relatifs au coin du dessin (l’ancre de scenes.js)
  const versDessin = () => {
    const m = dessin.getScreenCTM(), r = dessin.getBoundingClientRect(), pt = dessin.createSVGPoint();
    const map = ([x, y]) => { pt.x = x; pt.y = y; const q = pt.matrixTransform(m); return [q.x - r.left, q.y - r.top]; };
    map.unite = m.a;
    return map;
  };
  const [vx, , vw] = dessin.getAttribute('viewBox').split(' ').map(Number);
  const surBranche = () => {
    const map = versDessin(), pts = [];
    for (const [a, b] of [[vx + 8, 336], [674, vx + vw - 8]]) for (let x = a; x < b; x += 13 / map.unite) pts.push(map([x, brancheY(x) - 1]));
    return pts;
  };
  // shapes.starling dessine le corps du logo à 3,4 × autour de (112, 115) du repère de l’oiseau, centré sur 720 × 640
  // (posés par leur milieu, pas par leurs pieds : centred, dans scenes.js)
  const dansOiseau = (n) => { const map = versDessin(); return sampleShape(shapes.starling, n).map(([x, y]) => map(surPlanche([112 + (x - 360) / 3.4, 115 + (y - 320) / 3.4]))); };

  const dansLaNuee = () => nuee || partie === 'murmuration' || (!reduit && !partie && etape.classList.contains('actif'));
  return {
    element: dessin,
    // l’étape vient de devenir l’étape en cours (avant même que l’observateur ne le voie) : la nuée dessine d’abord l’oiseau,
    // et y va droit depuis la forme précédente
    variante: () => (dansLaNuee() ? 'etourneau-nuee' : 'etourneau'),
    points: (n) => (dansLaNuee() ? dansOiseau(n) : surBranche()),
    set quandChange(f) { quandChange = f; },
  };
}
