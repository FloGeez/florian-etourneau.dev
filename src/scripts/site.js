/* Florian Etourneau — comportements du site. La nuée accompagne toute la lecture. */
import { createNuee } from './nuee.js';
import { initTheme } from './theme.js';
import { FORMES, echantillon, minuteRennes } from './formes.js';
import { initContact } from './contact.js';
import { aile, pointsAile, BOUT_AILE, opaciteAileDessus, transformTete, opacitesBec, DUREE_TETE, DUREES, courbes, clamp, lerp, seg, bump, rotP, corpsPose, pattesPose, placerVol, ailesVol, bobVol, avancerVol, POSE } from './oiseau.js';
import { animer } from './horloge.js';

const root = document.documentElement;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();

/* La nuée */
const couleurs = () => [css('--fe-oiseaux'), css('--fe-oiseaux'), css('--fe-oiseaux-2')];
const nuee = createNuee(document.getElementById('nuee'), { count: innerWidth <= 860 ? 200 : 320, colors: couleurs() });
initTheme(() => nuee.setColors(couleurs()));

const scene = document.querySelector('.scene'), sceneAccueil = document.querySelector('.scene-accueil');
const G = {"W": 1200, "Y0": 340, "SAG": 10, "BX": 720, "HX": 1030, "K": 0.95};
/* Sur petit écran, on recadre la scène sur l’oiseau et le panier : tout est deux fois plus grand, le jeu devient jouable. */
const VB = { x: 0, y: 40, w: 1200, h: 330 };
const cadrer = () => {
  const serre = innerWidth < 700;
  Object.assign(VB, serre ? { x: 590, y: 40, w: 610, h: 330 } : { x: 0, y: 40, w: 1200, h: 330 });
  scene.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  sceneAccueil.style.setProperty('--poteau-x', ((1089.4 - VB.x) / VB.w * 100).toFixed(2) + '%');
  sceneAccueil.style.setProperty('--panneau-bas', ((1 - (77.8 - VB.y) / VB.h) * 100).toFixed(2) + '%');
};
cadrer(); addEventListener('resize', cadrer);
/* Sur grand écran, la scène remonte sous le texte : le fil doit être visible sans défiler,
   sans que l’oiseau, le ballon ou l’indice ne passent sous une ligne de texte. */
const intro = document.querySelector('.accueil .intro');
// les lignes réellement écrites (nœuds texte), pas les boîtes des éléments
const lignesTexte = () => [document.querySelector('.accueil h1'), intro].flatMap((el) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), out = []; let n;
  while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); out.push(...r.getClientRects()); }
  return out;
});
const placerScene = () => {
  if (innerWidth < 1000) { sceneAccueil.style.marginTop = ''; return; }
  sceneAccueil.style.marginTop = '0px';
  const s = sceneAccueil.getBoundingClientRect(), k = s.width / VB.w, haut0 = s.top + scrollY;
  const filY = (344 - VB.y) * k, finTexte = intro.getBoundingClientRect().bottom + scrollY;
  // où l’on voudrait le fil : juste au-dessus du bas de l’écran, jamais collé au texte
  const cible = Math.max(finTexte + 48, Math.min(innerHeight - 40, finTexte + 280));
  let haut = cible - filY;
  // l’oiseau, le ballon et l’indice (x de 640 à 1100 dans la scène) restent sous les lignes qu’ils croisent
  const gx = (640 - VB.x) * k + s.left, dx = (1100 - VB.x) * k + s.left, zoneHaut = (95 - VB.y) * k;
  lignesTexte().forEach((l) => { if (l.right > gx && l.left < dx) haut = Math.max(haut, l.bottom + scrollY + 8 - zoneHaut); });
  sceneAccueil.style.marginTop = Math.round(haut - haut0) + 'px';
};
placerScene(); addEventListener('resize', placerScene);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placerScene);
// L’oiseau ne s’envole que lorsque sa scène commence à sortir par le haut
const seuilEnvol = () => { const r = scene.getBoundingClientRect(); return Math.max(innerHeight * 0.2, r.top + scrollY + r.height * 0.45 - innerHeight * 0.3); };
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
let attente = false;
addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(() => { attente = false; majEtape(); decider(); envol(); }); } }, { passive: true });
addEventListener('resize', () => { majEtape(); decider(true); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => decider(true));
majEtape(); decider(true);

/* En-tête */
const entete = document.querySelector('.entete');
const surDefile = () => entete.classList.toggle('defile', scrollY > 8);
addEventListener('scroll', surDefile, { passive: true }); surDefile();


/* Le tir : à toi de jouer. L’aile lève le ballon ; on tire vers l’arrière, on vise, on lâche.
   Le tableau d’affichage compte les paniers, les tirs et les 24 secondes.
   L’oiseau est articulé (src/scripts/oiseau.js) : la même aile passe de pliée à levée par l’avant, sans jamais
   passer derrière le corps ; la tête suit le ballon pendant qu’il vole. */
const tir = (() => {
  const svg = scene, ballon = document.getElementById('ballon'), filet = document.getElementById('filet');
  const ailePliee = document.getElementById('aile-pliee'), aileDessus = document.getElementById('aile-dessus');
  const corpsEl = document.getElementById('corps-pose'), pattesEl = document.getElementById('pattes-pose');
  const teteEl = document.getElementById('tete-pose'), crane = document.getElementById('crane-pose');
  const becFace = document.getElementById('bec-face'), becProfil = teteEl.querySelector('.fe-bec');
  const trace = document.getElementById('trajectoire'), indice = document.getElementById('indice-tir');
  const visee = document.getElementById('visee'), vDir = document.getElementById('visee-dir'), vForce = document.getElementById('visee-force');
  const tableau = document.getElementById('tableau'), tPaniers = document.getElementById('t-paniers'), tTirs = document.getElementById('t-tirs'), t24 = document.getElementById('t-24');
  const G = 930, R = 16, EP = POSE.EPAULE, VMAX = 820;
  const OX = 660.6, OY = 190.8, KO = 130 / 140;
  const versScene = (lx, ly) => [OX + (lx - 40) * KO, OY + (ly - 24) * KO];
  // leve : 0 aile pliée → 1 aile levée ; angle : rotation en plus, autour de l’épaule, une fois l’aile levée (visée, tir)
  let leve = 1, bascule = 0, hauteur = 0, corps = corpsPose();
  // la main : le bout de l’aile, prolongé de 20 unités ; à leve = 1 et angle = 0, c’est l’ancien point (130, −12) + 20
  const main = (ang, t = leve) => {
    const b = rotP(pointsAile(t)[BOUT_AILE], ang, EP), dx = b[0] - EP[0], dy = b[1] - EP[1], n = Math.hypot(dx, dy);
    const q = corps.point([b[0] + dx / n * 20, b[1] + dy / n * 20]);
    return versScene(q[0], q[1]);
  };
  const filY = (x) => { const t = x / 1200; return 340 + 40 * t * (1 - t); };
  let etat = 'main', x = 0, y = 0, vx = 0, vy = 0, rot = 0, tirs = 0, paniers = 0, compte = false, prise = null, parti = false, points = [];
  const placer = () => ballon.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`);
  let angle = 0;
  function dessinerOiseau() {
    corps = corpsPose({ bascule, dy: hauteur });
    corpsEl.setAttribute('transform', corps.transform);
    pattesEl.setAttribute('d', pattesPose({ bascule, dy: hauteur }));
    const d = aile(leve), r = `rotate(${angle.toFixed(1)} ${EP[0]} ${EP[1]})`;
    ailePliee.setAttribute('d', d); ailePliee.setAttribute('transform', r);
    aileDessus.setAttribute('d', d); aileDessus.setAttribute('transform', r);
    aileDessus.style.opacity = opaciteAileDessus(leve).toFixed(3);
  }
  const tenir = () => { [x, y] = main(angle); placer(); };
  const orienter = (a) => { angle = a; dessinerOiseau(); };

  /* La tête : un coup sec pour se retourner, puis elle tient ; l’inclinaison suit le ballon en douceur */
  const tete = { sens: 1, depuis: 1, cible: 1, t: 1, penche: 0, ciblePenche: 0, actif: false };
  const TETE = versScene(119, 58), POITRINE_X = versScene(...POSE.POITRINE)[0];
  function dessinerTete() {
    const tr = transformTete(tete.sens, tete.penche); teteEl.setAttribute('transform', tr); crane.setAttribute('transform', tr);
    const o = opacitesBec(tete.sens); becProfil.style.opacity = o.profil.toFixed(3); becFace.style.opacity = o.face.toFixed(3);
  }
  function majTete(dt) {
    tete.t = Math.min(1, tete.t + dt / DUREE_TETE);
    tete.sens = lerp(tete.depuis, tete.cible, courbes.entreeSortie(tete.t));
    tete.penche += (tete.ciblePenche - tete.penche) * (1 - Math.exp(-dt / 0.08));
    const fini = tete.t >= 1 && Math.abs(tete.ciblePenche - tete.penche) < 0.05;
    if (fini) tete.penche = tete.ciblePenche;
    dessinerTete();
    if (fini) { tete.actif = false; return false; }
  }
  function regarder(sens, penche) {
    if (sens !== tete.cible) { tete.depuis = tete.sens; tete.cible = sens; tete.t = 0; }
    tete.ciblePenche = penche;
    if (reduit) { tete.sens = sens; tete.t = 1; tete.penche = penche; dessinerTete(); return; }
    if (!tete.actif) { tete.actif = true; animer(majTete); }
  }
  // le ballon derrière l’oiseau : il se retourne ; devant : il le suit du bec
  function suivreBallon() {
    const sens = x < POITRINE_X ? -1 : 1;
    const a = Math.atan2(y - TETE[1], sens > 0 ? x - TETE[0] : TETE[0] - x) * 180 / Math.PI;
    regarder(sens, sens * clamp(a, -20, 14));
  }
  const swish = () => { if (filet.animate) filet.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.2)' }, { transform: 'scaleY(.95)' }, { transform: 'scaleY(1)' }], { duration: 520, easing: 'ease-out' }); };
  filet.style.transformBox = 'fill-box'; filet.style.transformOrigin = '50% 0';
  // « à toi de tirer » : à 24 px du ballon (grille de 4), du côté où il y a la place
  const placerIndice = () => {
    const W = svg.clientWidth, k = W / VB.w, [bx, by] = main(0, 1);
    // version courte quand la longue toucherait le cercle du panier (tablette, mobile)
    const libelle = indice.querySelector('span'), cercleG = (988 - VB.x) * k;
    libelle.textContent = 'à toi de tirer';
    if ((bx - VB.x) * k + 16 * k + 24 + indice.offsetWidth + 12 > cercleG) libelle.textContent = 'tire !';
    const w = indice.offsetWidth, h = indice.offsetHeight;
    const droite = (bx - VB.x) * k + 16 * k + 24, gauche = (690 - VB.x) * k - 24 - w;
    const aDroite = droite + w + 16 <= W;
    indice.classList.toggle('a-gauche', !aDroite);
    indice.style.left = Math.round(aDroite ? droite : Math.max(16, gauche)) + 'px';
    indice.style.top = Math.round((by - VB.y) * k - h / 2) + 'px';
  };
  placerIndice(); addEventListener('resize', placerIndice);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placerIndice);
  // les gestes de l’aile : un nouveau geste interrompt le précédent
  let geste = 0;
  const anim = (duree, f, fin) => {
    const id = ++geste; let e = 0;
    animer((dt) => { if (id !== geste) return false; e += dt * 1000; const u = Math.min(1, e / duree); f(u); if (u >= 1) { if (fin) fin(); return false; } });
  };
  const deux = (n) => String(Math.min(99, n)).padStart(2, '0');

  /* Le tableau Bodet n’apparaît qu’à la première prise de ballon : il descend de ses câbles */
  const potence = document.querySelector('.tableau-potence');
  tableau.classList.add('range'); potence.classList.add('range');
  const montrerTableau = () => { tableau.classList.remove('range'); potence.classList.remove('range'); };
  /* Les 24 secondes : elles partent quand on prend le ballon */
  let reste = 24, depart = 0, tourne = false, horloge = 0;
  const afficher24 = () => { t24.textContent = reste >= 5 ? deux(Math.ceil(reste - 1e-6)) : Math.max(0, reste).toFixed(1); t24.classList.toggle('urgent', reste < 5); };
  function lancer24() { if (tourne) return; tourne = true; depart = performance.now() - (24 - reste) * 1000; horloge = setInterval(() => { reste = 24 - (performance.now() - depart) / 1000; if (reste <= 0) { reste = 0; stop24(); buzzer(); } afficher24(); }, 100); }
  function stop24() { tourne = false; clearInterval(horloge); }
  function remise24() { stop24(); reste = 24; afficher24(); tableau.classList.remove('buzz'); }
  function buzzer() {
    tableau.classList.add('buzz');
    if (etat === 'main' || etat === 'leve') { prise = null; svg.classList.remove('vise'); visee.setAttribute('hidden', ''); lacherAuSol(); }
  }
  const majTableau = (flash) => { tPaniers.textContent = deux(paniers); tTirs.textContent = deux(tirs); if (flash) { tableau.classList.remove('point'); void tableau.offsetWidth; tableau.classList.add('point'); } };

  // lever l’aile (--fe-duration-longue) : 100 ms d’anticipation, puis 550 ms avec un léger dépassement ; le corps recule de 3°
  function soulever() {
    etat = 'leve'; rot = 0; points = []; trace.setAttribute('d', ''); angle = 0;
    regarder(1, 0);
    if (reduit) { leve = 1; bascule = 0; dessinerOiseau(); tenir(); ballon.style.opacity = 1; etat = 'main'; return; }
    ballon.style.opacity = 0;
    anim(DUREES.longue * 1000, (u) => {
      const a = seg(u, 0, 0.15), b = seg(u, 0.15, 1);
      leve = u < 0.15 ? -0.05 * courbes.entree(a) : -0.05 + 1.05 * courbes.depassement(b, 1.3);
      bascule = -3 * courbes.douce(b);
      dessinerOiseau(); tenir();
      if (b > 0.3) ballon.style.opacity = 1; // le ballon apparaît quand l’aile passe devant le ventre
    }, () => { etat = 'main'; });
  }
  // replier l’aile (--fe-duration-moyenne), sans à-coup
  function replier() {
    const l0 = leve, b0 = bascule, a0 = angle;
    if (reduit) { leve = 0; bascule = 0; angle = 0; dessinerOiseau(); return; }
    anim(DUREES.moyenne * 1000, (u) => { const k = courbes.entreeSortie(u); leve = l0 * (1 - k); bascule = b0 * (1 - k); angle = a0 * (1 - k); dessinerOiseau(); });
  }
  function revenir(delai) {
    setTimeout(() => {
      if (etat !== 'repos' || parti) return;
      ballon.style.opacity = 0; trace.style.opacity = 0;
      setTimeout(() => { remise24(); trace.style.opacity = 1; if (etat === 'repos' && !parti) soulever(); }, 260);
    }, delai);
  }
  function lacherAuSol() { etat = 'vol'; vx = 30; vy = 0; compte = true; replier(); physique(); }
  function lacher(v0x, v0y) {
    etat = 'vol'; vx = v0x; vy = v0y; compte = false; tirs++; majTableau(false);
    indice.classList.add('parti'); points = [[x, y]];
    anim(140, (u) => orienter(-12 + 42 * u), () => anim(300, (u) => orienter(30 * (1 - u)), replier));
    physique();
  }
  let vols = 0;
  function physique() {
    const id = ++vols;
    animer((dtBrut) => {
      if (id !== vols) return false;
      const dt = Math.min(0.033, dtBrut);
      for (let i = 0; i < 3 && etat !== 'repos'; i++) avancer(dt / 3);
      placer();
      // les pointillés se dessinent derrière le ballon
      if (points.length) { const [lx, ly] = points[points.length - 1]; if (Math.hypot(x - lx, y - ly) > 10) { points.push([x, y]); trace.setAttribute('d', 'M' + points.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')); } }
      if (etat === 'vol') suivreBallon();
      if (etat === 'repos') { stop24(); revenir(1100); return false; }
    });
  }
  const CERCLE = [[988.2, 159.5], [1071.8, 159.5]];
  function avancer(dt) {
    const py = y;
    vy += G * dt; x += vx * dt; y += vy * dt; rot += vx * dt * 2.2;
    for (const [cx, cy] of CERCLE) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d < R + 3 && d > 0) { const nx = dx / d, ny = dy / d, vn = vx * nx + vy * ny; x = cx + nx * (R + 3); y = cy + ny * (R + 3); if (vn < 0) { vx -= 1.55 * vn * nx; vy -= 1.55 * vn * ny; } }
    }
    if (y > 70 && y < 192 && x + R > 1085.1 && x < 1089.4 && vx > 0) { x = 1085.1 - R; vx = -vx * 0.55; }
    if (y > 184 && x + R > 1087.5 && x < 1089.4) { x = 1087.5 - R; vx = -Math.abs(vx) * 0.5; }
    if (y > 184 && x - R < 1091.3 && x > 1089.4) { x = 1091.3 + R; vx = Math.abs(vx) * 0.5; }
    if (x > 992 && x < 1068 && y > 160 && y < 206) { vx *= 0.9; vy = Math.min(vy, 260); }
    if (!compte && py < 159.5 && y >= 159.5 && x > 994 && x < 1066 && vy > 0) { compte = true; paniers++; swish(); stop24(); majTableau(true); }
    const sol = filY(x) - R - 1;
    if (y > sol && vy > 0) { y = sol; if (vy > 70) { vy = -vy * 0.5; vx *= 0.8; } else { vy = 0; vx *= 0.94; if (Math.abs(vx) < 6) etat = 'repos'; } }
    if (x < -60 || x > 1270 || y > 700) { etat = 'repos'; x = 700; y = filY(700) - R - 1; ballon.style.opacity = 0; }
  }

  /* Visée : on ne voit pas la courbe, seulement la direction et la puissance */
  const pointScene = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const vitesse = (p) => { let wx = (prise.x - p.x) * 5.4, wy = (prise.y - p.y) * 5.4; const n = Math.hypot(wx, wy); if (n > VMAX) { wx *= VMAX / n; wy *= VMAX / n; } return [wx, wy, Math.min(n, VMAX)]; };
  function viser(wx, wy, n) {
    if (n < 90) { visee.setAttribute('hidden', ''); return; }
    visee.removeAttribute('hidden');
    const ux = wx / n, uy = wy / n, a = R + 8, L = 120, f = n / VMAX;
    const p = (d) => `${(x + ux * d).toFixed(1)} ${(y + uy * d).toFixed(1)}`;
    vDir.setAttribute('d', `M${p(a)} L${p(a + L)}`);
    vForce.setAttribute('d', `M${p(a)} L${p(a + L * f)}`);
    vForce.style.stroke = `color-mix(in oklab, var(--fe-primary) ${Math.round(100 - f * 70)}%, var(--fe-terre-500))`;
  }
  function debut(e) {
    if (etat !== 'main' || parti) return;
    e.preventDefault(); prise = pointScene(e); prise.id = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    svg.classList.add('vise'); indice.classList.add('parti'); montrerTableau(); lancer24();
  }
  function bouge(e) {
    if (!prise || e.pointerId !== prise.id) return;
    const [wx, wy, n] = vitesse(pointScene(e));
    orienter(-Math.min(1, n / VMAX) * 14); tenir(); viser(wx, wy, n);
  }
  function fin(e) {
    if (!prise || e.pointerId !== prise.id) return;
    const [wx, wy, n] = vitesse(pointScene(e)); prise = null; svg.classList.remove('vise'); visee.setAttribute('hidden', '');
    if (n > 90 && e.type !== 'pointercancel') lacher(wx, wy); else { orienter(0); tenir(); }
  }
  // au doigt, le navigateur prendrait le geste pour un défilement (touch-action n’agit pas dans un SVG) : on le bloque dès le toucher du ballon
  const bloquer = (e) => { if ((etat === 'main' && !parti) || prise) e.preventDefault(); };
  [ballon, document.getElementById('tireur')].forEach((el) => {
    el.addEventListener('touchstart', bloquer, { passive: false }); el.addEventListener('touchmove', bloquer, { passive: false });
    el.addEventListener('pointerdown', debut); el.addEventListener('pointermove', bouge);
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  });
  ballon.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && etat === 'main') {
      e.preventDefault(); montrerTableau(); lancer24(); const T = 1.0 + (Math.random() - 0.5) * 0.08;
      const cx = 1030 + (Math.random() - 0.5) * 34, cy = 150;
      lacher((cx - x) / T, (cy - y - 0.5 * G * T * T) / T);
    }
  });
  afficher24(); majTableau(false);
  if (reduit) { leve = 1; orienter(0); tenir(); } else { leve = 0; dessinerOiseau(); ballon.style.opacity = 0; etat = 'leve'; setTimeout(soulever, 600); }
  return {
    // Décoller : pas de geste intermédiaire (au défilement, il arrivait trop tard). Le relais vers l’oiseau en vol est immédiat,
    // à la même place et à la même taille ; surRelais reçoit la poitrine (repère de la scène).
    envol(estParti, surRelais) {
      if (estParti === parti) return; parti = estParti;
      if (parti) {
        if (etat === 'main' || etat === 'leve') { prise = null; visee.setAttribute('hidden', ''); svg.classList.remove('vise'); lacherAuSol(); }
        geste++; hauteur = 0; bascule = 0; angle = 0; dessinerOiseau();
        surRelais(versScene(...corps.point(POSE.POITRINE)));
      } else {
        // retour sur le fil : l’oiseau reprend sa pose ; s’il n’a plus le ballon, il le reprend
        geste++; hauteur = 0; bascule = 0; angle = 0; leve = etat === 'main' || etat === 'leve' ? 1 : 0; dessinerOiseau();
        if (etat === 'repos') revenir(350);
      }
    },
  };
})();

/* L’envol de Florian, avec la nuée */
const pose = document.getElementById('oiseau-pose'), vol = document.getElementById('oiseau-vol');
// Le vol suit le sens de lecture : l’oiseau décolle, puis plonge vers la suite de la page (en bas à droite de l’écran).
// Le trajet est défini à l’écran, puis ramené dans les coordonnées de la scène.
const bez = (P, u) => { const a = 1 - u; return [0, 1].map((k) => a * a * a * P[0][k] + 3 * a * a * u * P[1][k] + 3 * a * u * u * P[2][k] + u * u * u * P[3][k]); };
// Les ailes battent au rythme du temps ; le défilement ne pilote que la trajectoire.
// L’étourneau bat en montant et plane en piquant (plane → 1, ailes tenues à tPlane).
function battement(g) {
  const pres = g.querySelector('.vol-pres'), loin = g.querySelector('.vol-loin'), dedans = g.querySelector('.vol-dedans');
  const st = { c: 0, plane: 0, cible: 0, tPlane: 0.3, actif: false };
  const dessiner = () => {
    const a = ailesVol(st.c, st.plane, st.tPlane);
    pres.setAttribute('d', a.pres); loin.setAttribute('d', a.loin);
    dedans.setAttribute('transform', `translate(0 ${bobVol(st.c, st.plane).toFixed(2)})`);
  };
  const maj = (dt) => {
    if (!st.actif) return false;
    avancerVol(st, dt, st.cible);
    dessiner();
    if (st.chaqueImage) st.chaqueImage(dt);
  };
  return { st, dessiner, demarrer() { if (st.actif || reduit) return; st.actif = true; animer(maj); }, arreter() { st.actif = false; } };
}
const ailesEnvol = battement(vol);
const KO_POSE = 130 / 140; // échelle de l’oiseau posé dans la scène : l’oiseau en vol part à la même taille
let decolle = false, relais = null, volP = 0;
function placerEnVol() {
  const r = scene.getBoundingClientRect(), k = r.width / VB.w, W = innerWidth, H = innerHeight;
  // la trajectoire part de la poitrine de l’oiseau au relais, puis plonge vers la suite de la page
  const depart = [r.left + (relais.poitrine[0] - VB.x) * k, r.top + (relais.poitrine[1] - VB.y) * k];
  const P = [depart, [depart[0] + W * 0.08, depart[1] - H * 0.14], [W * 0.78, H * 0.3], [W * 1.08, H * 0.78]];
  const u = clamp((volP - relais.p0) / (1 - relais.p0), 0, 1), [X, Y] = bez(P, u), [X2, Y2] = bez(P, Math.min(1, u + 0.01));
  const cible = [(X - r.left) / k + VB.x, (Y - r.top) / k + VB.y];
  const pente = Math.atan2(Y2 - Y, X2 - X) * 180 / Math.PI;
  // juste après le relais, l’oiseau part de l’inclinaison de l’oiseau posé (−48° : son axe), puis prend celle de la trajectoire (200 ms)
  const e = courbes.sortie(relais.t / 0.2), ang = lerp(-48, pente * 0.6, e), s = lerp(KO_POSE, 0.5, u);
  const [x, y] = placerVol(cible, ang, s);
  vol.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(3)}) translate(-114,-80)`);
  ailesEnvol.st.cible = pente > 15 ? 1 : 0;
}
ailesEnvol.st.chaqueImage = (dt) => { if (relais && relais.t < 0.2) { relais.t = Math.min(0.2, relais.t + dt); placerEnVol(); } };
function envol() {
  if (reduit) return;
  const seuil = seuilEnvol();
  volP = Math.min(1, Math.max(0, (scrollY - seuil) / (innerHeight * 0.6)));
  const parti = scrollY > seuil;
  if (parti !== decolle) {
    decolle = parti; relais = null;
    tir.envol(parti, (poitrine) => { if (!decolle) return; relais = { poitrine, p0: Math.min(volP, 0.9), t: 0 }; ailesEnvol.st.c = 0; ailesEnvol.st.plane = 0; envol(); });
  }
  const enVol = parti && relais && volP < 1;
  pose.style.visibility = parti && relais ? 'hidden' : 'visible';
  vol.toggleAttribute('hidden', !enVol);
  if (!enVol) { ailesEnvol.arreter(); return; }
  placerEnVol();
  ailesEnvol.demarrer();
}
envol();

/* Rennes, en direct */
const heure = document.getElementById('heure');
const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
const tic = () => { heure.textContent = fmt.format(new Date()).replace(':', ' h '); };
tic(); setInterval(tic, 15000);
// …et le temps qu’il fait (Open-Meteo, sans clé). En cas d’échec, on n’affiche rien.
const meteo = document.getElementById('meteo'), temperature = document.getElementById('temperature');
const releve = () => fetch('https://api.open-meteo.com/v1/forecast?latitude=48.11&longitude=-1.68&current=temperature_2m&timezone=Europe%2FParis')
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((j) => { const t = j && j.current && j.current.temperature_2m; if (typeof t !== 'number') return; temperature.textContent = `${Math.round(t)} °C`; meteo.hidden = false; })
  .catch(() => {});
releve(); setInterval(releve, 15 * 60 * 1000);

/* Retour au nid : Florian traverse la page, plane ailes levées, se redresse et se pose avec sa famille.
   Au relais, l’oiseau en vol et l’oiseau du nid se superposent (aile levée, corps penché) : on passe de l’un à l’autre sur une image. */
const nid = document.getElementById('nid');
const arrivee = vol.cloneNode(true);
arrivee.id = 'oiseau-arrivee';
arrivee.querySelectorAll('clipPath').forEach((c) => { const ancien = c.id; c.id = ancien + '-a'; arrivee.querySelectorAll(`[clip-path="url(#${ancien})"]`).forEach((n) => n.setAttribute('clip-path', `url(#${c.id})`)); });
arrivee.setAttribute('hidden', '');
nid.parentNode.insertBefore(arrivee, nid.nextSibling);
const ailesArrivee = battement(arrivee);
// l’oiseau du nid, articulé (même repère que la charte, placé à x 576,5 / y 77, échelle 104/140)
const corpsNid = document.getElementById('corps-nid'), pattesNid = document.getElementById('pattes-nid');
const aileNid = document.getElementById('aile-pliee-nid'), aileNidDessus = document.getElementById('aile-dessus-nid');
const NID = { x: 576.5, y: 77, k: 104 / 140 };
const versFamille = (p) => [NID.x + (p[0] - 40) * NID.k, NID.y + (p[1] - 24) * NID.k];
function dessinerNid(e) {
  corpsNid.setAttribute('transform', corpsPose(e).transform);
  pattesNid.setAttribute('d', pattesPose(e, e.pieds, e.doigts));
  const d = aile(e.leve); aileNid.setAttribute('d', d); aileNidDessus.setAttribute('d', d);
  aileNidDessus.setAttribute('opacity', opaciteAileDessus(e.leve).toFixed(3));
}
// la pose du nid, t secondes après le relais : chute, contact (écrasement), redressement, repli de l’aile
const poser = (t) => {
  const chute = courbes.entree(seg(t, 0, 0.22)), contact = seg(t, 0.22, 0.6), repli = courbes.entreeSortie(seg(t, 0.3, 0.75));
  return {
    dy: -16 * (1 - chute) + 4 * bump(contact) * (1 - contact * 0.4),
    bascule: 18 - 18 * courbes.depassement(seg(t, 0.1, 0.65), 2.2),
    sx: 1 + 0.04 * bump(contact), sy: 1 - 0.08 * bump(contact),
    leve: 1 - repli,
    pieds: POSE.PIEDS.map((q) => [q[0] + 8 * (1 - chute), q[1]]),
    doigts: [20 * (1 - chute), 20 * (1 - chute)],
  };
};
function atterrir() {
  const D = 1.9, POSE_FIN = 0.95, S0 = 0.82;
  // la poitrine de l’oiseau posé au moment du relais : la trajectoire y mène
  const cible = versFamille(corpsPose(poser(0)).point(POSE.POITRINE));
  const Q = [[-160, -70], [260, -120], [cible[0] - 88, cible[1] - 45], cible];
  const qpt = (u) => { const a = 1 - u; return [0, 1].map((k) => a * a * a * Q[0][k] + 3 * a * a * u * Q[1][k] + 3 * a * u * u * Q[2][k] + u * u * u * Q[3][k]); };
  let t = 0, relaye = false;
  arrivee.removeAttribute('hidden'); ailesArrivee.st.c = 0; ailesArrivee.st.plane = 0; ailesArrivee.st.tPlane = 0.05; ailesArrivee.demarrer();
  animer((dt) => {
    t += dt;
    if (!relaye) {
      const r = Math.min(1, t / D), u = 1 - Math.pow(1 - r, 2.2);
      const q = qpt(u), q2 = qpt(Math.min(1, u + 0.01));
      const tangente = Math.atan2(q2[1] - q[1], q2[0] - q[0]) * 180 / Math.PI;
      const ang = lerp(tangente * 0.5, -30, courbes.entreeSortie(seg(r, 0.8, 1))); // il se redresse pour freiner
      const s = lerp(S0, NID.k, u);
      ailesArrivee.st.cible = r > 0.7 ? 1 : 0; // plané ailes levées sur la fin
      const [x, y] = placerVol(q, ang, s);
      arrivee.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(3)}) translate(-114,-80)`);
      if (r >= 1) { relaye = true; t = 0; ailesArrivee.arreter(); arrivee.setAttribute('hidden', ''); nid.classList.remove('attend'); }
      return;
    }
    dessinerNid(poser(t));
    if (t >= POSE_FIN) { dessinerNid(poser(POSE_FIN + 1)); return false; }
  });
}
if (reduit || !('IntersectionObserver' in window)) nid.classList.remove('attend');
else new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { obs.disconnect(); setTimeout(atterrir, 150); } }, { threshold: 0.55 }).observe(famille);

/* Sur petit écran, on recadre la famille : sinon les oiseaux font la taille d’une fourmi */
const cadrerFamille = () => famille.setAttribute('viewBox', innerWidth < 700 ? '470 50 720 180' : '0 0 1200 240');
cadrerFamille(); addEventListener('resize', cadrerFamille);

/* Le fils du milieu dribble quelques fois quand on arrive en bas, puis garde le ballon.
   Un clic (ou Entrée) sur lui relance le dribble. */
const pied = document.querySelector('.pied'), dribbleur = document.getElementById('dribbleur'), dribble = document.querySelector('.dribble');
const dribbler = () => { if (reduit) return; pied.classList.remove('dribble-on'); void dribble.getBBox(); pied.classList.add('dribble-on'); };
dribble.addEventListener('animationend', (e) => { if (e.target === dribble) pied.classList.remove('dribble-on'); });
dribbleur.addEventListener('click', dribbler);
dribbleur.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dribbler(); } });
if ('IntersectionObserver' in window) {
  let vu = false;
  new IntersectionObserver(([en]) => { if (en.isIntersecting && !vu) { vu = true; setTimeout(dribbler, 1200); } else if (!en.isIntersecting) vu = false; }, { threshold: 0.4 }).observe(famille);
}

/* Copier l’adresse — le ballon rebondit et trace la coche */
const copier = document.getElementById('copier'), adresse = document.getElementById('adresse'), statut = document.getElementById('statut-copie');
const libelle = copier.querySelector('span');
let minuterieCopie = 0;
const confirmer = (texte) => {
  clearTimeout(minuterieCopie);
  copier.classList.remove('copie'); void copier.offsetWidth; copier.classList.add('copie'); copier.parentNode.classList.add('copie-ok');
  libelle.textContent = texte; statut.textContent = texte === 'Copié' ? 'Adresse copiée' : 'Adresse sélectionnée';
  minuterieCopie = setTimeout(() => { copier.classList.remove('copie'); copier.parentNode.classList.remove('copie-ok'); libelle.textContent = 'Copier'; statut.textContent = ''; }, 2400);
};
copier.addEventListener('click', () => {
  const repli = () => { const sel = getSelection(), r = document.createRange(); r.selectNodeContents(adresse); sel.removeAllRanges(); sel.addRange(r); confirmer('Sélectionnée'); };
  try { navigator.clipboard.writeText(adresse.textContent.trim()).then(() => confirmer('Copié'), repli); } catch (err) { repli(); }
});

initContact(document.getElementById('formulaire'), document.getElementById('ecrire'), document.getElementById('envoi'));
