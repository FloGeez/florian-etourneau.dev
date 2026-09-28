/* Où se pose la nuée, section par section : le fil de l’accueil, les pictos de « maintenant », les lignes du parcours,
   les boutons du contact. Chaque section est une scène du moteur (moteur-nuee.js) ; majEtape() suit l’étape du récit en cours.
   Avec ?debug dans l’adresse : la scène en cours, les places et la zone de l’essaim s’affichent. */
import { createNuee } from './nuee.js';
import { creerMoteur } from './moteur-nuee.js';
import { initTheme } from './theme.js';
import { FORMES, echantillon, minuteRennes } from './formes.js';
import { G } from './scene-accueil.js';

const root = document.documentElement;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
const debug = new URLSearchParams(location.search).has('debug');

export function initNuee({ scene, VB, seuilEnvol }) {
  const couleurs = () => [css('--fe-oiseaux'), css('--fe-oiseaux'), css('--fe-oiseaux-2')];
  const nuee = createNuee(document.getElementById('nuee'), { count: innerWidth <= 860 ? 200 : 320, colors: couleurs(), debug });
  initTheme(() => nuee.setColors(couleurs()));

  const pointsFil = () => {
    const r = scene.getBoundingClientRect(), k = r.width / VB.w, pts = [];
    for (let x = VB.x + 6; x < VB.x + VB.w; x += 13 / k) {
      if (x > G.BX - 80 && x < G.BX + 70) continue;
      if (x > G.HX + 2 && x < G.HX + 96) continue;
      const t = x / G.W, y = G.Y0 + 4 * G.SAG * t * (1 - t);
      pts.push([r.left + scrollX + (x - VB.x) * k, r.top + scrollY + (y - VB.y) * k]);
    }
    return pts;
  };
  // Autant de points que d’oiseaux
  const nbForme = () => (innerWidth <= 860 ? 180 : 300);
  const perchoir = document.getElementById('perchoir');
  // Où dessiner : la grande scène collée (bureau) ou l’emplacement réservé au-dessus de l’étape (mobile)
  const zoneForme = () => (innerWidth <= 860 ? actif.querySelector('.etape-scene') : perchoir);
  const origine = (el) => () => { const r = el.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY]; };
  const pointsForme = (nom, el) => {
    const r = el.getBoundingClientRect(), k = Math.min(r.width / 720, r.height / 640) * (innerWidth <= 860 ? 1.1 : 1.08), ox = (r.width - 720 * k) / 2, oy = (r.height - 640 * k) / 2;
    return echantillon(nom, nbForme()).map(([x, y], i) => [ox + x * k, oy + y * k + 6]);
  };
  const lignes = [...document.querySelectorAll('.parcours li[data-annees]')];
  const pointsParcours = () => {
    const pts = [];
    lignes.forEach((li) => {
      const r = li.getBoundingClientRect(), debut = li.querySelector('.poste').getBoundingClientRect().left;
      const n = Math.round(parseFloat(li.dataset.annees) * 6);
      for (let i = 0; i < n; i++) { const x = debut + 6 + i * 11; if (x > r.right - 6) break; pts.push([x + scrollX, r.bottom + scrollY - 0.5]); }
    });
    return pts;
  };

  /* « maintenant » : un récit. La scène reste collée, les étapes défilent, la nuée dessine le picto de l’étape en cours. */
  const recit = document.querySelector('.recit'), etapes = [...document.querySelectorAll('.etape')];
  let actif = etapes[0];
  const majEtape = () => {
    const centre = (innerHeight + 68) / 2;
    let m = actif, dm = 1e9;
    etapes.forEach((e) => { const r = e.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - centre); if (d < dm) { dm = d; m = e; } });
    if (m !== actif) { actif = m; etapes.forEach((e) => e.classList.toggle('actif', e === m)); }
  };

  const formeActive = () => {
    const f = actif.dataset.forme.split(' ');
    const n = f.length > 1 && !reduit ? f[Math.floor(performance.now() / 3500) % f.length] : f[0];
    return n === 'rennes' ? n + '@' + minuteRennes() : n;
  };
  // Prépare les formes pendant les temps morts, pour que la nuée parte sans à-coup
  const aLoisir = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  const prechauffer = () => Object.keys(FORMES).forEach((n, i) => aLoisir(() => echantillon(n, nbForme()), { timeout: 2000 + i * 300 }));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(prechauffer); else prechauffer();
  // Où tourne l’essaim des oiseaux sans place, section par section — jamais sur le texte
  const titre = document.querySelector('.accueil h1');
  const ellipse = (x, y, rx, ry) => ({ x: x + scrollX, y: y + scrollY, rx, ry });
  const orbiteAccueil = () => {
    const s = scene.getBoundingClientRect(), h = titre.getBoundingClientRect();
    if (innerWidth >= 1000) return ellipse(h.right + (innerWidth - h.right) * 0.5, h.top + 10, Math.min(210, (innerWidth - h.right) * 0.36), 64);
    return ellipse(s.left + s.width * 0.5, s.top + s.height * 0.1, s.width * 0.3, s.height * 0.08);
  };
  const orbiteForme = (el) => () => { const r = el.getBoundingClientRect(); return ellipse(r.left + r.width / 2, r.top - 12, r.width * 0.3, 22); };
  // Parcours : l’essaim va et vient le long d’un L, jamais sur la liste : au-dessus d’elle, à droite du titre
  // « parcours », puis dans la marge droite, sur la hauteur de l’écran. Quand le haut de la liste est passé, il ne reste que la marge.
  const ESSAIM_PARCOURS = 40;
  const repereParcours = document.querySelector('#parcours .repere-section');
  const margeParcours = () => innerWidth - liste.getBoundingClientRect().right;
  const orbiteParcours = () => {
    const l = liste.getBoundingClientRect(), r = repereParcours.getBoundingClientRect();
    const x = innerWidth - margeParcours() / 2, bas = Math.min(innerHeight * 0.8, l.bottom);
    const haut = (r.top + r.bottom) / 2;
    const pts = haut > 80 ? [[l.left + l.width * 0.5, haut], [x, haut], [x, bas]] : [[x, innerHeight * 0.15], [x, bas]];
    return { chemin: pts.map(([px, py]) => [px + scrollX, py + scrollY]) };
  };
  // Contact : 3 oiseaux sur « Copier », 2 sur « Écrire un message » (2 sur « Copier » seulement, sur petit écran), sur le bord du haut
  const pointsBoutons = () => {
    const places = innerWidth < 700 ? [['copier', 2]] : [['copier', 3], ['ecrire', 2]];
    return places.flatMap(([id, n]) => {
      const el = document.getElementById(id);
      if (!el || el.hidden) return [];
      const r = el.getBoundingClientRect();
      return Array.from({ length: n }, (_, i) => [r.left + scrollX + 16 + i * 13, r.top + scrollY]);
    });
  };
  const liste = document.querySelector('.parcours'), famille = document.querySelector('.famille');
  const vh = () => innerHeight;

  /* Les scènes, de haut en bas : la première active l’emporte (moteur-nuee.js). Aucune : la nuée vole librement. */
  const moteur = creerMoteur(nuee, [
    // l’accueil : sur le fil ; les oiseaux sans place tournent à droite du titre (sur petit écran, ils se serrent sur le fil)
    {
      nom: 'fil',
      active: () => scrollY < Math.max(30, seuilEnvol() * 0.6),
      pose: ({ premiere, force }) => ({ places: pointsFil(), instant: premiere || force, reste: innerWidth < 700 ? 'doubler' : 'tourner', zone: orbiteAccueil }),
    },
    // « maintenant » : le picto de l’étape en cours, dans la scène collée ; l’essaim tourne au-dessus
    {
      nom: 'forme',
      active: () => { const r = recit.getBoundingClientRect(); return r.top < vh() * 0.55 && r.bottom > vh() * 0.6; },
      variante: formeActive,
      pose: ({ variante }) => { const el = zoneForme(); return { places: pointsForme(variante.split('@')[0], el), ancre: origine(el), reste: 'tourner', zone: orbiteForme(el) }; },
    },
    // le parcours : un oiseau posé = deux mois ; un petit essaim dans la marge de droite s’il y en a une, les autres quittent l’écran
    {
      nom: 'parcours',
      active: () => { const r = liste.getBoundingClientRect(); return r.top < vh() * 0.75 && r.bottom > vh() * 0.35; },
      pose: () => ({ places: pointsParcours(), reste: margeParcours() >= 140 ? 'tourner' : 'partir', zone: orbiteParcours, garder: ESSAIM_PARCOURS }),
    },
    // la liste passée, la nuée s’en va, sauf quelques oiseaux qui se posent sur les boutons du contact (farouches)
    {
      nom: 'contact',
      active: () => famille.getBoundingClientRect().top < vh() * 0.85 || liste.getBoundingClientRect().bottom <= vh() * 0.35,
      pose: () => ({ places: pointsBoutons(), instant: false, reste: 'partir', farouches: true }),
    },
  ], { debug });

  // Les boutons changent de taille (« Copié », « Écrire un message » qui apparaît) : les oiseaux se recalent
  if ('ResizeObserver' in window) {
    const recaler = new ResizeObserver(() => { if (moteur.scene === 'contact') moteur.maj(true); });
    ['copier', 'ecrire'].forEach((id) => { const el = document.getElementById(id); if (el) recaler.observe(el); });
  }
  addEventListener('resize', () => { majEtape(); moteur.maj(true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moteur.maj(true));
  majEtape(); moteur.maj(true);

  // au défilement (une fois par image, voir site.js)
  return { maj() { majEtape(); moteur.maj(); } };
}
