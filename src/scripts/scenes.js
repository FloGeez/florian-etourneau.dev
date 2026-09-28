/* Où se pose la nuée, section par section : le fil de l’accueil, les pictos de « maintenant », les lignes du parcours,
   les boutons du contact. decider() choisit la scène selon le défilement ; majEtape() suit l’étape du récit en cours. */
import { createNuee } from './nuee.js';
import { initTheme } from './theme.js';
import { FORMES, echantillon, minuteRennes } from './formes.js';
import { G } from './scene-accueil.js';

const root = document.documentElement;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();

export function initNuee({ scene, VB, seuilEnvol }) {
  const couleurs = () => [css('--fe-oiseaux'), css('--fe-oiseaux'), css('--fe-oiseaux-2')];
  const nuee = createNuee(document.getElementById('nuee'), { count: innerWidth <= 860 ? 200 : 320, colors: couleurs() });
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
  setInterval(() => { if (cle.startsWith('forme:')) decider(); }, 500);
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
  // Les boutons changent de taille (« Copié », « Écrire un message » qui apparaît) : les oiseaux se recalent
  if ('ResizeObserver' in window) {
    const recaler = new ResizeObserver(() => { if (cle === 'depart') decider(true); });
    ['copier', 'ecrire'].forEach((id) => { const el = document.getElementById(id); if (el) recaler.observe(el); });
  }
  const liste = document.querySelector('.parcours'), famille = document.querySelector('.famille');
  let cle = '', premier = true;
  const decider = (force) => {
    const vh = innerHeight; let c, f;
    const rs = recit.getBoundingClientRect(), rl = liste.getBoundingClientRect(), rf = famille.getBoundingClientRect();
    if (scrollY < Math.max(30, seuilEnvol() * 0.6)) { c = 'fil'; f = () => nuee.perch(pointsFil(), premier || force, innerWidth < 700 ? 'doubler' : 'tourner', null, orbiteAccueil); }
    else if (rs.top < vh * 0.55 && rs.bottom > vh * 0.6) { const n = formeActive(); c = 'forme:' + n; const el = zoneForme(); f = () => nuee.perch(pointsForme(n.split('@')[0], el), force && cle === c, 'tourner', origine(el), orbiteForme(el)); }
    // sur le parcours, un petit essaim tourne dans la marge de droite s’il y en a une ; les autres oiseaux sans place quittent l’écran
    else if (rl.top < vh * 0.75 && rl.bottom > vh * 0.35) { c = 'parcours'; f = () => nuee.perch(pointsParcours(), force && cle === 'parcours', margeParcours() >= 140 ? 'tourner' : 'partir', null, orbiteParcours, ESSAIM_PARCOURS); }
    // la liste passée, la nuée s’en va, sauf quelques oiseaux qui se posent sur les boutons du contact (farouches)
    else if (rf.top < vh * 0.85 || rl.bottom <= vh * 0.35) { c = 'depart'; f = () => nuee.perch(pointsBoutons(), false, 'partir', null, null, Infinity, true); }
    else { c = 'vol'; f = () => nuee.fly(); }
    if (c !== cle || force) { cle = c; f(); }
    premier = false;
  };
  addEventListener('resize', () => { majEtape(); decider(true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => decider(true));
  majEtape(); decider(true);

  // au défilement (une fois par image, voir site.js)
  return { maj() { majEtape(); decider(); } };
}
