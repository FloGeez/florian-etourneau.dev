/* Florian Etourneau — comportements du site. La nuée accompagne toute la lecture. */
import { createNuee } from './nuee.js';

const root = document.documentElement;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();

/* Thème */
const bouton = document.getElementById('bouton-theme');
let memo = null; try { memo = localStorage.getItem('fe-theme'); } catch (e) {}
if (memo === 'light' || memo === 'dark') root.dataset.theme = memo;
const estSombre = () => root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
const majBouton = () => bouton.setAttribute('aria-label', estSombre() ? 'Passer en thème clair' : 'Passer en thème sombre');
majBouton();

/* La nuée */
const couleurs = () => [css('--fe-oiseaux'), css('--fe-oiseaux'), css('--fe-oiseaux-2')];
const nuee = createNuee(document.getElementById('nuee'), { count: innerWidth <= 860 ? 200 : 320, colors: couleurs() });
bouton.addEventListener('click', () => {
  root.dataset.theme = estSombre() ? 'light' : 'dark';
  try { localStorage.setItem('fe-theme', root.dataset.theme); } catch (e) {}
  majBouton(); nuee.setColors(couleurs());
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => nuee.setColors(couleurs()));

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
/* Formes que dessine la nuée — canevas 720 × 640, tracé au trait. Chaque forme doit se lire en une seconde. */
/* Formes pleines pour la nuée — canevas 720 × 640. On remplit (noir), on évide (destination-out).
 Les oiseaux remplissent la matière : la forme se lit par masse et par creux, comme une vraie murmuration. */
/* Formes pleines pour la nuée — canevas 720 × 640. On remplit (noir), on évide (destination-out).
 Les oiseaux remplissent la matière : la forme se lit par masse et par creux, comme une vraie murmuration. */
/* Formes pleines pour la nuée — canevas 720 × 640. On remplit (noir), on évide (destination-out).
 Les oiseaux remplissent la matière : la forme se lit par masse et par creux, comme une vraie murmuration. */
/* Formes pleines pour la nuée — canevas 720 × 640. On remplit (noir), on évide (destination-out).
 Les oiseaux remplissent la matière : la forme se lit par masse et par creux, comme une vraie murmuration. */
const FORMES = (() => {
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const plein = (g) => { g.globalCompositeOperation = 'source-over'; };
const creux = (g) => { g.globalCompositeOperation = 'destination-out'; };
const barre = (g, x, y, w, h = 20) => { rr(g, x, y - h / 2, w, h, h / 2); g.fill(); };
const trait = (g, x1, y1, x2, y2, e) => { g.lineWidth = e; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
return {
  // Au travail : la puce (le picto IA de la charte) avec du code dedans — le code, augmenté par l’IA
  travail: (g) => {
    plein(g); g.strokeStyle = '#000';
    rr(g, 190, 150, 340, 340, 44); g.fill();
    [250, 360, 470].forEach((p) => { rr(g, p - 16, 70, 32, 90, 12); g.fill(); rr(g, p - 16, 480, 32, 90, 12); g.fill(); rr(g, 110, p - 16 + 0, 90, 32, 12); g.fill(); rr(g, 520, p - 16, 90, 32, 12); g.fill(); });
    creux(g); g.lineWidth = 34; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(315, 250); g.lineTo(255, 320); g.lineTo(315, 390); g.moveTo(405, 250); g.lineTo(465, 320); g.lineTo(405, 390); g.stroke();
    plein(g);
  },
  // Angular Tiptap Editor : son logo — le crayon croqué et les touches A T E
  editeur: (g) => {
    const police = `800 128px "Bricolage Grotesque", "Arial Black", system-ui, sans-serif`;
    plein(g);
    g.beginPath(); g.moveTo(100, 200); g.lineTo(178, 200); g.lineTo(98, 440); g.quadraticCurveTo(93, 452, 80, 452); g.lineTo(28, 452); g.quadraticCurveTo(14, 452, 19, 438); g.closePath(); g.fill();
    creux(g); g.beginPath(); g.arc(178, 200, 22, 0, 6.2832); g.fill(); g.beginPath(); g.arc(184, 232, 16, 0, 6.2832); g.fill();
    plein(g);
    // touches en contour, lettres pleines : plus lisible avec peu d’oiseaux
    const touches = [[190, 'A'], [365, 'T'], [540, 'E']];
    g.strokeStyle = '#000'; g.lineWidth = 16;
    touches.forEach(([x]) => { rr(g, x + 8, 244, 148, 156, 32); g.stroke(); });
    g.font = police; g.textAlign = 'center'; g.textBaseline = 'middle';
    touches.forEach(([x, l]) => g.fillText(l, x + 82, 324));
  },
  // Max CV : l’outil maison de MaxDS — son symbole (le carré, les trois points, le D)
  maxds: (g) => {
    const k = 440 / 520, X = (x) => 140 + (x - 1480) * k, Y = (y) => 100 + y * k, L = (v) => v * k;
    plein(g); rr(g, X(1480), Y(0), L(520), L(497), L(26)); g.fill();
    creux(g);
    [[1585, 105], [1538, 216], [1585, 327]].forEach(([x, y]) => { g.beginPath(); g.rect(X(x), Y(y), L(66), L(66)); g.fill(); });
    g.beginPath(); g.moveTo(X(1693), Y(60)); g.lineTo(X(1727), Y(60)); g.arc(X(1727), Y(249), L(189), -Math.PI / 2, Math.PI / 2); g.lineTo(X(1693), Y(438)); g.lineTo(X(1693), Y(372)); g.lineTo(X(1727), Y(372));
    g.arc(X(1727), Y(249), L(123), Math.PI / 2, -Math.PI / 2, true); g.lineTo(X(1693), Y(126)); g.closePath(); g.fill();
    plein(g);
  },
  // Rennes : le repère, et dedans l’heure qu’il est là-bas
  rennes: (g, heure = new Date()) => {
    const [h, m] = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(heure).filter((p) => p.type !== 'literal').map((p) => +p.value);
    const cx = 360, cy = 250;
    plein(g); g.beginPath();
    g.moveTo(cx, 600); g.bezierCurveTo(cx - 80, 500, cx - 210, 380, cx - 210, 250); g.bezierCurveTo(cx - 210, 120, cx - 115, 40, cx, 40); g.bezierCurveTo(cx + 115, 40, cx + 210, 120, cx + 210, 250); g.bezierCurveTo(cx + 210, 380, cx + 80, 500, cx, 600); g.fill();
    creux(g); g.beginPath(); g.arc(cx, cy, 128, 0, 6.2832); g.fill();
    plein(g); g.strokeStyle = '#000';
    const am = (m / 60) * 6.2832 - 1.5708, ah = ((h % 12) / 12 + m / 720) * 6.2832 - 1.5708;
    trait(g, cx, cy, cx + Math.cos(am) * 100, cy + Math.sin(am) * 100, 30);
    trait(g, cx, cy, cx + Math.cos(ah) * 66, cy + Math.sin(ah) * 66, 36);
    [0, 1, 2, 3].forEach((i) => { const a = i * 1.5708; trait(g, cx + Math.cos(a) * 108, cy + Math.sin(a) * 108, cx + Math.cos(a) * 118, cy + Math.sin(a) * 118, 22); });
  },
  // Le panier et le ballon
  basket: (g) => {
    plein(g); g.strokeStyle = '#000';
    rr(g, 110, 40, 380, 250, 18); g.fill();
    creux(g); rr(g, 140, 70, 320, 190, 8); g.fill();
    plein(g); g.lineWidth = 24; g.lineJoin = 'round'; g.beginPath(); g.rect(245, 155, 110, 85); g.stroke();
    g.lineWidth = 20; g.beginPath(); g.ellipse(300, 290, 100, 18, 0, 0, 6.2832); g.stroke();
    [[210, 300, 240, 450], [390, 300, 360, 450], [270, 308, 284, 450], [330, 308, 316, 450]].forEach(([a, b, c, d]) => trait(g, a, b, c, d, 18));
    trait(g, 232, 400, 368, 400, 18);
    const bx = 560, by = 450, r = 116;
    g.beginPath(); g.arc(bx, by, r, 0, 6.2832); g.fill();
    creux(g); g.lineWidth = 22; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx - r, by); g.lineTo(bx + r, by); g.moveTo(bx, by - r); g.lineTo(bx, by + r);
    g.moveTo(bx - 80, by - 84); g.quadraticCurveTo(bx - 26, by, bx - 80, by + 84); g.moveTo(bx + 80, by - 84); g.quadraticCurveTo(bx + 26, by, bx + 80, by + 84); g.stroke();
    plein(g);
  },
};
})();





const cacheFormes = {};
const minuteRennes = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date());
// Autant de points que d’oiseaux : le contour, serré, pour la lisibilité ; l’intérieur, clairsemé, pour la matière.
const nbForme = () => (innerWidth <= 860 ? 180 : 300);
const masque = (nom) => {
  const c = document.createElement('canvas'); c.width = 720; c.height = 640;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.strokeStyle = '#000'; FORMES[nom](g);
  return g.getImageData(0, 0, 720, 640).data;
};
const dedans = (d, x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < 720 && y < 640 && d[(y * 720 + x) * 4 + 3] > 128; };
const remplir = (d, De) => {
  const pts = [], cell = new Map(), C = De;
  const cle = (i, j) => i * 1000 + j;
  const ajoute = (x, y) => { const k = cle(Math.floor(x / C), Math.floor(y / C)); (cell.get(k) || cell.set(k, []).get(k)).push([x, y]); pts.push([x, y]); };
  const proche = (x, y, r) => { const cx = Math.floor(x / C), cy = Math.floor(y / C), n = Math.ceil(r / C); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const l = cell.get(cle(cx + i, cy + j)); if (l) for (const q of l) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < r * r) return true; } return false; };
  for (let y = 0; y < 640; y += 2) for (let x = 0; x < 720; x += 2) {
    if (!dedans(d, x, y) || (dedans(d, x + 4, y) && dedans(d, x - 4, y) && dedans(d, x, y + 4) && dedans(d, x, y - 4))) continue;
    if (!proche(x, y, De)) ajoute(x, y);
  }
  const Di = De * 2.1, dy = Di * 0.866;
  for (let y = Di / 2, r = 0; y < 640; y += dy, r++) for (let x = (r % 2 ? Di / 2 : 0) + Di / 4; x < 720; x += Di) if (dedans(d, x, y) && !proche(x, y, De * 1.1)) ajoute(x, y);
  return pts;
};
const policePrete = () => !document.fonts || document.fonts.status === 'loaded';
const echantillon = (nom) => {
  const nb = nbForme(), cle = (nom === 'rennes' ? nom + minuteRennes() : nom) + '/' + nb;
  if (cacheFormes[cle]) return cacheFormes[cle];
  const d = masque(nom); let bas = 4, haut = 64, meilleur = remplir(d, 30);
  for (let i = 0; i < 8; i++) { const D = (bas + haut) / 2, p = remplir(d, D); if (p.length > nb) bas = D; else { haut = D; meilleur = p; } }
  if (policePrete()) cacheFormes[cle] = meilleur;
  return meilleur;
};
const perchoir = document.getElementById('perchoir');
// Où dessiner : la grande scène collée (bureau) ou l’emplacement réservé au-dessus de l’étape (mobile)
const zoneForme = () => (innerWidth <= 860 ? actif.querySelector('.etape-scene') : perchoir);
const origine = (el) => () => { const r = el.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY]; };
const pointsForme = (nom, el) => {
  const r = el.getBoundingClientRect(), k = Math.min(r.width / 720, r.height / 640) * (innerWidth <= 860 ? 1.1 : 1.08), ox = (r.width - 720 * k) / 2, oy = (r.height - 640 * k) / 2;
  return echantillon(nom).map(([x, y], i) => [ox + x * k, oy + y * k + 6]);
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
const recit = document.querySelector('.recit'), etapes = [...document.querySelectorAll('.etape')], numero = null;
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
const prechauffer = () => Object.keys(FORMES).forEach((n, i) => aLoisir(() => echantillon(n), { timeout: 2000 + i * 300 }));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(prechauffer); else prechauffer();
// Où tourne l’essaim des oiseaux sans place, section par section — jamais sur le texte
const repereParcours = document.querySelector('#parcours .repere-section'), titre = document.querySelector('.accueil h1');
const ellipse = (x, y, rx, ry) => ({ x: x + scrollX, y: y + scrollY, rx, ry });
const orbiteAccueil = () => {
  const s = scene.getBoundingClientRect(), h = titre.getBoundingClientRect();
  if (innerWidth >= 1000) return ellipse(h.right + (innerWidth - h.right) * 0.5, h.top + 10, Math.min(210, (innerWidth - h.right) * 0.36), 64);
  return ellipse(s.left + s.width * 0.5, s.top + s.height * 0.1, s.width * 0.3, s.height * 0.08);
};
const orbiteForme = (el) => () => { const r = el.getBoundingClientRect(); return ellipse(r.left + r.width / 2, r.top - 12, r.width * 0.3, 22); };
const orbiteParcours = () => {
  const r = repereParcours.getBoundingClientRect(), l = liste.getBoundingClientRect();
  if (innerWidth > 860) return ellipse(r.left + r.width * 0.45, l.top + l.height * 0.68, r.width * 0.4, Math.min(110, l.height * 0.28));
  return ellipse(l.left + l.width * 0.55, r.top - 44, l.width * 0.32, 22);
};
const liste = document.querySelector('.parcours'), famille = document.querySelector('.famille');
let cle = '', premier = true;
const decider = (force) => {
  const vh = innerHeight; let c, f;
  const rs = recit.getBoundingClientRect(), rl = liste.getBoundingClientRect(), rf = famille.getBoundingClientRect();
  if (scrollY < Math.max(30, seuilEnvol() * 0.6)) { c = 'fil'; f = () => nuee.perch(pointsFil(), premier || force, innerWidth < 700 ? 'doubler' : 'tourner', null, orbiteAccueil); }
  else if (rs.top < vh * 0.55 && rs.bottom > vh * 0.6) { const n = formeActive(); c = 'forme:' + n; const el = zoneForme(); f = () => nuee.perch(pointsForme(n.split('@')[0], el), force && cle === c, 'tourner', origine(el), orbiteForme(el)); }
  else if (rl.top < vh * 0.75 && rl.bottom > vh * 0.35) { c = 'parcours'; f = () => nuee.perch(pointsParcours(), force && cle === 'parcours', 'tourner', null, orbiteParcours); }
  else if (rf.top < vh * 0.85) { c = 'depart'; f = () => nuee.scatter(); }
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
   Le tableau d’affichage compte les paniers, les tirs et les 24 secondes. */
const tir = (() => {
  const svg = scene, ballon = document.getElementById('ballon'), filet = document.getElementById('filet');
  const aile = document.getElementById('aile-levee'), oiseau = document.getElementById('oiseau-pose');
  const trace = document.getElementById('trajectoire'), indice = document.getElementById('indice-tir');
  const visee = document.getElementById('visee'), vDir = document.getElementById('visee-dir'), vForce = document.getElementById('visee-force');
  const tableau = document.getElementById('tableau'), tPaniers = document.getElementById('t-paniers'), tTirs = document.getElementById('t-tirs'), t24 = document.getElementById('t-24');
  const G = 930, R = 16, EP = [96, 100], BOUT = [130, -12], VMAX = 820;
  const OX = 660.6, OY = 190.8, KO = 130 / 140;
  const versScene = (lx, ly) => [OX + (lx - 40) * KO, OY + (ly - 24) * KO];
  const main = (ang) => {
    const a = ang * Math.PI / 180, dx = BOUT[0] - EP[0], dy = BOUT[1] - EP[1];
    const tx = dx * Math.cos(a) - dy * Math.sin(a), ty = dx * Math.sin(a) + dy * Math.cos(a), n = Math.hypot(tx, ty);
    return versScene(EP[0] + tx + tx / n * 20, EP[1] + ty + ty / n * 20);
  };
  const filY = (x) => { const t = x / 1200; return 340 + 40 * t * (1 - t); };
  const REPLI = -150;
  let etat = 'main', x = 0, y = 0, vx = 0, vy = 0, rot = 0, raf = 0, tirs = 0, paniers = 0, compte = false, prise = null, parti = false, points = [];
  const placer = () => ballon.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`);
  const lever = (a) => aile.setAttribute('transform', `rotate(${a.toFixed(1)} ${EP[0]} ${EP[1]})`);
  let angle = 0; const tenir = () => { [x, y] = main(angle); placer(); };
  const orienter = (a) => { angle = a; lever(a); };
  const swish = () => { if (filet.animate) filet.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.2)' }, { transform: 'scaleY(.95)' }, { transform: 'scaleY(1)' }], { duration: 520, easing: 'ease-out' }); };
  filet.style.transformBox = 'fill-box'; filet.style.transformOrigin = '50% 0';
  // « à toi de tirer » : à 24 px du ballon (grille de 4), du côté où il y a la place
  const placerIndice = () => {
    const W = svg.clientWidth, k = W / VB.w, [bx, by] = main(0);
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
  const anim = (duree, f, fin) => { const t0 = performance.now(); const pas = (now) => { const u = Math.min(1, (now - t0) / duree); f(u); if (u < 1) requestAnimationFrame(pas); else if (fin) fin(); }; requestAnimationFrame(pas); };
  const doux = (u) => 1 - Math.pow(1 - u, 3);
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
  const majTableau = (flash) => { tPaniers.textContent = deux(paniers); tTirs.textContent = deux(tirs); if (flash) { tableau.classList.remove('marque'); void tableau.offsetWidth; tableau.classList.add('marque'); } };

  function soulever() {
    etat = 'leve'; oiseau.classList.add('arme'); rot = 0; points = []; trace.setAttribute('d', '');
    orienter(REPLI); tenir(); ballon.style.opacity = 1;
    if (reduit) { orienter(0); tenir(); etat = 'main'; return; }
    anim(650, (u) => { orienter(REPLI * (1 - doux(u))); tenir(); }, () => { etat = 'main'; });
  }
  function revenir(delai) {
    setTimeout(() => {
      if (etat !== 'repos' || parti) return;
      ballon.style.opacity = 0; trace.style.opacity = 0;
      setTimeout(() => { remise24(); trace.style.opacity = 1; if (etat === 'repos' && !parti) soulever(); }, 260);
    }, delai);
  }
  function lacherAuSol() { etat = 'vol'; vx = 30; vy = 0; compte = true; oiseau.classList.remove('arme'); physique(); }
  function lacher(v0x, v0y) {
    etat = 'vol'; vx = v0x; vy = v0y; compte = false; tirs++; majTableau(false);
    indice.classList.add('parti'); points = [[x, y]];
    anim(140, (u) => orienter(-12 + 42 * u), () => anim(300, (u) => orienter(30 * (1 - u)), () => oiseau.classList.remove('arme')));
    physique();
  }
  function physique() {
    cancelAnimationFrame(raf); let prec = performance.now();
    const pas = (now) => {
      const dt = Math.min(0.033, (now - prec) / 1000); prec = now;
      for (let i = 0; i < 3 && etat !== 'repos'; i++) avancer(dt / 3);
      placer();
      // les pointillés se dessinent derrière le ballon
      if (points.length) { const [lx, ly] = points[points.length - 1]; if (Math.hypot(x - lx, y - ly) > 10) { points.push([x, y]); trace.setAttribute('d', 'M' + points.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')); } }
      if (etat === 'repos') { stop24(); revenir(1100); return; }
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
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
    vForce.style.stroke = `color-mix(in oklab, var(--fe-primary) ${Math.round(100 - f * 70)}%, #E0452B)`;
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
  [ballon, document.getElementById('tireur')].forEach((el) => {
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
  if (reduit) { orienter(0); tenir(); } else { oiseau.classList.add('arme'); orienter(REPLI); tenir(); etat = 'leve'; setTimeout(soulever, 600); }
  return {
    envol(estParti) {
      if (estParti === parti) return; parti = estParti;
      if (parti && (etat === 'main' || etat === 'leve')) { prise = null; visee.setAttribute('hidden', ''); svg.classList.remove('vise'); lacherAuSol(); }
      if (!parti && etat === 'repos') revenir(350);
    },
  };
})();

/* L’envol de Florian, avec la nuée */
const pose = document.getElementById('oiseau-pose'), vol = document.getElementById('oiseau-vol');
const haut = vol.querySelector('.ailes-haut'), bas = vol.querySelector('.ailes-bas');
// Le vol suit le sens de lecture : l’oiseau décolle, puis plonge vers la suite de la page (en bas à droite de l’écran).
// Le trajet est défini à l’écran, puis ramené dans les coordonnées de la scène.
const bez = (P, u) => { const a = 1 - u; return [0, 1].map((k) => a * a * a * P[0][k] + 3 * a * a * u * P[1][k] + 3 * a * u * u * P[2][k] + u * u * u * P[3][k]); };
let battement = 0;
function envol() {
  if (reduit) return;
  const seuil = seuilEnvol(), p = Math.min(1, Math.max(0, (scrollY - seuil) / (innerHeight * 0.6)));
  const parti = scrollY > seuil; pose.style.visibility = parti ? 'hidden' : 'visible'; vol.toggleAttribute('hidden', !parti || p >= 1);
  tir.envol(parti);
  if (!parti || p >= 1) return;
  const r = scene.getBoundingClientRect(), k = r.width / VB.w, W = innerWidth, H = innerHeight;
  const depart = [r.left + (720 - VB.x) * k, r.top + (289.6 - VB.y) * k];
  const P = [depart, [depart[0] + W * 0.08, depart[1] - H * 0.14], [W * 0.78, H * 0.3], [W * 1.08, H * 0.78]];
  const u = p, [X, Y] = bez(P, u), [X2, Y2] = bez(P, Math.min(1, u + 0.01));
  const x = (X - r.left) / k + VB.x, y = (Y - r.top) / k + VB.y;
  const ang = Math.atan2(Y2 - Y, X2 - X) * 180 / Math.PI * 0.6, s = 0.72 - 0.22 * u;
  vol.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(3)}) translate(-114,-80)`);
  battement = (battement + 1) % 6; const h = battement < 3; haut.toggleAttribute('hidden', !h); bas.toggleAttribute('hidden', h);
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

/* Retour au nid : Florian traverse la page et se pose avec sa famille */
const nid = document.getElementById('nid');
const arrivee = vol.cloneNode(true);
arrivee.id = 'oiseau-arrivee';
arrivee.querySelectorAll('clipPath').forEach((c) => { const ancien = c.id; c.id = ancien + '-a'; arrivee.querySelectorAll(`[clip-path="url(#${ancien})"]`).forEach((n) => n.setAttribute('clip-path', `url(#${c.id})`)); });
arrivee.setAttribute('hidden', '');
nid.parentNode.insertBefore(arrivee, nid.nextSibling);
const aHaut = arrivee.querySelector('.ailes-haut'), aBas = arrivee.querySelector('.ailes-bas');
const Q = [[-160, -70], [260, -120], [540, 96], [628.5, 141]];
const qpt = (u) => { const a = 1 - u; return [0, 1].map((k) => a * a * a * Q[0][k] + 3 * a * a * u * Q[1][k] + 3 * a * u * u * Q[2][k] + u * u * u * Q[3][k]); };
const seposer = () => { arrivee.setAttribute('hidden', ''); nid.classList.remove('attend'); nid.classList.add('pose'); };
function atterrir() {
  const D = 1900; let t0 = null;
  arrivee.removeAttribute('hidden');
  const pas = (now) => {
    if (t0 === null) t0 = now;
    const r = Math.min(1, (now - t0) / D), u = 1 - Math.pow(1 - r, 2.2);
    const [x, y] = qpt(u), [x2, y2] = qpt(Math.min(1, u + 0.01));
    const fin = Math.max(0, (r - 0.82) / 0.18);
    const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI * 0.5 * (1 - fin) - 8 * fin;
    const s = 0.82 - 0.24 * u;
    arrivee.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(3)}) translate(-114,-80)`);
    const h = fin > 0 ? true : Math.floor((now - t0) / 85) % 2 === 0;
    aHaut.toggleAttribute('hidden', !h); aBas.toggleAttribute('hidden', h);
    if (r < 1) requestAnimationFrame(pas); else seposer();
  };
  requestAnimationFrame(pas);
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
