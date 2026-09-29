/* Le tir : à toi de jouer. L’aile lève le ballon ; on tire vers l’arrière, on vise, on lâche.
   Le tableau d’affichage compte les paniers, les tirs et les 24 secondes.
   L’oiseau est articulé (src/scripts/oiseau.js) : la même aile passe de pliée à levée par l’avant, sans jamais
   passer derrière le corps ; la tête suit le ballon pendant qu’il vole. */
import { aile, pointsAile, BOUT_AILE, opaciteAileDessus, transformTete, opacitesBec, DUREE_TETE, DUREES, courbes, clamp, lerp, seg, rotP, corpsPose, pattesPose, POSE } from './oiseau.js';
import { animer } from './horloge.js';
import { battement } from './vol.js';

const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTir({ scene, VB }) {
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
    libelle.textContent = contre.fait ? 'allez, réessaie' : 'à toi de tirer';
    if ((bx - VB.x) * k + 16 * k + 24 + indice.offsetWidth + 12 > cercleG) libelle.textContent = contre.fait ? 'réessaie !' : 'tire !';
    const w = indice.offsetWidth, h = indice.offsetHeight;
    const droite = (bx - VB.x) * k + 16 * k + 24, gauche = (690 - VB.x) * k - 24 - w;
    const aDroite = droite + w + 16 <= W;
    indice.classList.toggle('a-gauche', !aDroite);
    indice.style.left = Math.round(aDroite ? droite : Math.max(16, gauche)) + 'px';
    indice.style.top = Math.round((by - VB.y) * k - h / 2) + 'px';
  };
  /* Le premier tir ne rentre jamais : un étourneau surgit du côté du panier et le contre. Ensuite, « allez, réessaie ».
     L’oiseau fonce sur le point où sera le ballon après contre.duree secondes (chute libre : il n’a rien touché avant). */
  const contre = { fait: reduit, actif: false, relance: false, t: 0, duree: 0.25, x: 0, y: 0 };
  const texteContre = document.getElementById('contre');
  const contreur = document.getElementById('oiseau-vol').cloneNode(true);
  contreur.id = 'contreur';
  contreur.querySelectorAll('clipPath').forEach((c) => { const ancien = c.id; c.id = ancien + '-c'; contreur.querySelectorAll(`[clip-path="url(#${ancien})"]`).forEach((n) => n.setAttribute('clip-path', `url(#${c.id})`)); });
  svg.appendChild(contreur);
  const ailesContreur = battement(contreur);
  const DEPART_C = 1300, SORTIE_C = -150;
  // de droite à gauche, en piqué : au plus bas au moment du contre, la tête juste au-dessus du ballon
  function placerContreur(t) {
    const v = (DEPART_C - contre.x) / contre.duree, bx = DEPART_C - v * t, by = contre.y - 14 - 0.0004 * (bx - contre.x) ** 2;
    contreur.setAttribute('transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)}) scale(-0.55 0.55) translate(-160 -90)`);
    return bx > SORTIE_C;
  }
  function lancerContre() {
    const T = contre.duree;
    contre.fait = true; contre.actif = true; contre.t = 0;
    contre.x = x + vx * T; contre.y = y + vy * T + 0.5 * G * T * T;
    placerContreur(0); contreur.removeAttribute('hidden'); ailesContreur.demarrer();
    let t = 0;
    // tant que le contre n’a pas eu lieu, l’oiseau suit l’horloge du ballon : ils se rejoignent à la même image
    animer((dt) => { t = contre.actif ? contre.t : t + dt; if (placerContreur(t)) return; contreur.setAttribute('hidden', ''); ailesContreur.arreter(); return false; });
  }
  // au contact : le ballon repart vers l’arrière et vers le bas, le texte surgit à l’endroit du contre
  function contrer() {
    contre.actif = false; vx = -260; vy = 160;
    const k = svg.clientWidth / VB.w;
    texteContre.style.left = Math.round(clamp((x - VB.x) * k, 120, svg.clientWidth - 120)) + 'px';
    texteContre.style.top = Math.round((y - VB.y) * k - 40) + 'px';
    texteContre.classList.remove('montre'); void texteContre.offsetWidth; texteContre.classList.add('montre');
  }
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
  // rangé dès le HTML (.range) : pas d’apparition furtive avant le chargement du script
  // au toucher, la tirade d’Iverson s’ouvre et se referme (au survol, le CSS suffit) ; un toucher ailleurs la ferme
  tableau.addEventListener('click', () => tableau.classList.toggle('bulle'));
  document.addEventListener('pointerdown', (e) => { if (!tableau.contains(e.target)) tableau.classList.remove('bulle'); });
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
    }, () => {
      etat = 'main';
      // après le contre, l’indice revient une fois : « allez, réessaie »
      if (contre.fait && !contre.relance && indice.classList.contains('parti')) { contre.relance = true; indice.classList.remove('parti'); placerIndice(); }
    });
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
    if (!contre.fait) lancerContre();
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
    if (contre.actif && (contre.t += dt) >= contre.duree) contrer();
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
}
