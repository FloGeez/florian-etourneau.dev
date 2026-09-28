/* La nuée — une murmuration d'étourneaux qui accompagne toute la page.
 * Un canvas fixe derrière le contenu ; les oiseaux vivent en coordonnées de document.
 *   const n = createNuee(canvas, { count: 170, colors: ['#5B2A9E', '#2A1245'], debug: false });
 *   n.perch(points, options)  // se poser sur une liste de points [x, y] (coordonnées document) ; options : voir perch
 *   (le choix de la scène, section par section, revient au moteur : moteur-nuee.js)
 *   n.fly()          // voler librement dans la marge du viewport
 *   n.scatter()      // quitter l'écran
 */
// Vitesses de la nuée (1 = le réglage d’origine à 60 images/s) :
// VITESSE pour les oiseaux qui vont se poser (pictos, fil, parcours) ; VOL_LIBRE pour la nuée qui tourne, plus lente :
// elle reste à l’écran pendant toute la lecture, elle ne doit pas attirer l’œil ; DEPART pour ceux qui quittent l’écran.
const VITESSE = 2, VOL_LIBRE = 0.8, DEPART = 1;
const SIL = new Path2D('M140 48 C132 34 108 32 98 46 C88 60 86 80 84 100 C82 130 70 160 52 192 L68 194 C80 176 92 164 102 156 C130 146 150 120 146 88 C145 78 143 70 140 66 Z');
export function createNuee(canvas, opts = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let colors = opts.colors || ['#5B2A9E', '#2A1245'];
  const N = opts.count || 170, S = opts.scale || 0.065;
  let orbite = null, O = null, ancre = null, org = [0, 0], ancreAvant = null, orgAvant = [0, 0], finAttente = 0, vw = innerWidth, vh = innerHeight, dpr = 1, raf = 0, mode = 'fly', mx = null, my = null, running = true;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1); vw = innerWidth; vh = innerHeight;
    canvas.width = vw * dpr; canvas.height = vh * dpr; canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    if (reduced) draw();
  };
  const B = [], grille = new Map();
  for (let k = 0; k < N; k++) B.push({ x: scrollX + vw * (0.2 + Math.random() * 0.6), y: scrollY + vh * Math.random() * 0.5, vx: Math.random() - 0.5, vy: Math.random() - 0.5, t: null, perched: false, away: false, ph: Math.random() * 6.283, c: colors[k % colors.length] });
  resize(); addEventListener('resize', resize);
  // la souris, en coordonnées de document : recalculée aussi au défilement (le pointeur ne bouge pas, la page si)
  let sx0 = null, sy0 = null;
  const suivre = () => { if (sx0 == null) return; mx = sx0 + scrollX; my = sy0 + scrollY; if (farouche) besoin = true; };
  addEventListener('pointermove', (e) => { sx0 = e.clientX; sy0 = e.clientY; suivre(); }, { passive: true });
  addEventListener('scroll', suivre, { passive: true });
  document.addEventListener('pointerleave', () => { sx0 = mx = null; });
  // farouche : les oiseaux posés s’envolent quand la souris approche, tournent au-dessus de leur place, puis s’y reposent
  let farouche = false;
  function effrayer(b, ms) { b.perched = false; const a = Math.atan2(b.y - my, b.x - mx); b.vx = Math.cos(a) * 2.5 + (Math.random() - 0.5); b.vy = -2.5 - Math.random() * 1.5; b.effroi = ms + 900 + Math.random() * 500; }

  function takeOff(b) { b.attente = 0; b.orb = false; b.effroi = 0; if (b.perched) { b.vy -= 2 + Math.random() * 1.5; b.vx += (Math.random() - 0.5) * 2; } b.perched = false; b.t = null; }
  // les oiseaux partis reviennent du côté d’où arrive la page : par le haut quand on remonte, par le bas quand on descend
  let scrollAvant = scrollY, monte = false;
  addEventListener('scroll', () => { if (scrollY !== scrollAvant) monte = scrollY < scrollAvant; scrollAvant = scrollY; }, { passive: true });
  function comeBack(b) {
    if (!b.away) return; b.away = false;
    b.x = scrollX + vw * (0.1 + Math.random() * 0.8);
    b.y = scrollY + (monte ? -20 - Math.random() * 60 : vh + 20 + Math.random() * 60);
    b.vx = (Math.random() - 0.5) * 2; b.vy = monte ? 2 + Math.random() : -2 - Math.random();
  }
  // Quitter l’écran : toute la nuée part du même côté, vers le haut à droite (±20°), et non en étoile depuis le centre
  function partir(b) { b.away = true; const a = -Math.PI / 3 + (Math.random() - 0.5) * 0.7; b.ex = Math.cos(a); b.ey = Math.sin(a); }
  // Le point d’attraction d’un chemin : il fait l’aller-retour le long de la ligne brisée, à 70 px/s, avec un léger flottement
  function surChemin(pts, now) {
    const lg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), total = lg.reduce((a, l) => a + l, 0) || 1;
    let s = (now * 70) % (2 * total); if (s > total) s = 2 * total - s;
    let i = 0; while (i < lg.length - 1 && s > lg[i]) { s -= lg[i]; i++; }
    const u = lg[i] ? Math.min(1, s / lg[i]) : 0, a = pts[i], z = pts[i + 1] || a;
    return [a[0] + (z[0] - a[0]) * u + Math.cos(now * 0.87) * 14, a[1] + (z[1] - a[1]) * u + Math.sin(now * 1.13) * 14];
  }
  // Se poser sur les points T. Options :
  //   instant : les oiseaux sont posés d’un coup (premier affichage, redimensionnement)
  //   reste : que font les oiseaux sans place ? 'voler' (défaut), 'doubler' (se serrer à côté d’un autre), 'tourner' (dans la zone), 'partir'
  //   ancre : fonction qui renvoie l’origine [x, y] (document) des points T ; la forme suit alors un élément qui bouge (position sticky…)
  //   zone : fonction qui renvoie l’ellipse {x, y, rx, ry} (document) où tournent les oiseaux sans place (reste = 'tourner'),
  //          ou un chemin {chemin: [[x, y], …]} (document) le long duquel ils vont et viennent
  //   garder : avec 'tourner', le nombre d’oiseaux sans place qui tournent ; les autres partent (tous tournent par défaut)
  //   farouches : les oiseaux posés s’envolent à l’approche de la souris (voir effrayer)
  function perch(T, { instant = false, reste = 'voler', ancre: anc = null, zone: orb = null, garder = Infinity, farouches = false } = {}) {
    calme = false; farouche = farouches;
    mode = 'perch'; orbite = reste === 'tourner' ? orb : null;
    // la nuée se reforme : les oiseaux posés s’envolent l’un après l’autre, de gauche à droite
    const now = performance.now(), avant = B.map((b) => (b.perched && b.t && !reduced && !instant ? b.t : null));
    ancreAvant = ancre; orgAvant = ancre ? ancre() : [0, 0];
    ancre = anc; org = anc ? anc() : [0, 0];
    B.forEach(takeOff);
    const tg = [...T].sort((a, c) => a[0] - c[0]);
    const n = Math.min(tg.length, B.length), pris = new Set();
    // les places vont d’abord aux oiseaux présents : on ne fait revenir des oiseaux partis que s’il en manque
    const presents = B.map((b, k) => k).filter((k) => !B[k].away);
    const order = (presents.length >= n ? presents : B.map((b, k) => k)).sort((a, c) => B[a].x - B[c].x), stride = order.length / n;
    for (let j = 0; j < n; j++) { const k = order[Math.floor(j * stride)]; B[k].t = tg[j]; pris.add(k); }
    let gardes = 0;
    B.forEach((b, k) => {
      if (!pris.has(k) && n && n < B.length) {
        if (reste === 'doubler') { const p = tg[Math.floor(Math.random() * n)]; b.t = [p[0] + (Math.random() < 0.5 ? -4 : 4), p[1]]; }
        else if (reste === 'tourner' && orb && gardes < garder) { b.orb = true; gardes++; }
        else if (reste === 'partir' || (reste === 'tourner' && orb)) { if (!b.away) partir(b); return; } // déjà partis : ils restent partis
      }
      comeBack(b);
    });
    const attendent = B.map((b, k) => k).filter((k) => avant[k]).sort((a, c) => avant[a][0] - avant[c][0]);
    attendent.forEach((k, r) => { const b = B[k]; b.ot = avant[k]; b.attente = now + (r / attendent.length) * 500 + Math.random() * 140; b.perched = true; b.vx = b.vy = 0; });
    finAttente = now + 700;
    if (reduced || instant) { B.forEach((b) => { if (b.t) { b.x = b.t[0] + org[0]; b.y = b.t[1] + org[1]; b.perched = true; } }); draw(); }
  }
  function fly() { calme = false; farouche = false; mode = 'fly'; ancre = null; orbite = null; B.forEach((b) => { takeOff(b); comeBack(b); }); if (reduced) draw(); }
  function scatter() {
    calme = false; farouche = false;
    mode = 'away'; ancre = null; orbite = null;
    B.forEach((b) => { takeOff(b); partir(b); });
    if (reduced) draw();
  }
  function offscreen(b) { return b.x < scrollX - 60 || b.x > scrollX + vw + 60 || b.y < scrollY - 60 || b.y > scrollY + vh + 60; }
  // pas : le temps écoulé, en « images à 60 Hz » ; chaque oiseau le multiplie par sa vitesse (k)
  function step(pas = 1) {
    const now = performance.now() / 1000;
    // zone de vol : la marge droite du viewport, un peu au-dessus du milieu
    const ax = scrollX + vw * (vw > 900 ? 0.86 : 0.66) + Math.cos(now * 0.33) * vw * 0.1;
    const ay = scrollY + vh * 0.3 + Math.sin(now * 0.51) * vh * 0.15;
    org = ancre ? ancre() : [0, 0];
    O = orbite ? orbite() : null;
    if (O && O.chemin) O.point = surChemin(O.chemin, now);
    const ms = performance.now(); if (ancreAvant && ms < finAttente) orgAvant = ancreAvant();
    // voisinage : une grille de 40 px pour les oiseaux libres (la nuée compte plusieurs centaines d’oiseaux)
    grille.clear();
    for (const o of B) { if (o.perched || o.away || o.t) continue; const c = Math.floor(o.x / 40) * 100003 + Math.floor(o.y / 40); const l = grille.get(c); if (l) l.push(o); else grille.set(c, [o]); }
    for (const b of B) {
      if (b.perched) {
        if (b.attente) {
          if (ms < b.attente) { b.x = b.ot[0] + orgAvant[0]; b.y = b.ot[1] + orgAvant[1]; continue; }
          b.attente = 0; b.perched = false; b.vy = -(1.5 + Math.random() * 2); b.vx = (Math.random() - 0.5) * 2;
        } else {
          if (ancre && b.t) { b.x = b.t[0] + org[0]; b.y = b.t[1] + org[1]; }
          if (!(farouche && b.t && mx != null && Math.hypot(b.x - mx, b.y - my) < 56)) continue;
          effrayer(b, ms);
        }
      }
      const k = pas * (b.away ? DEPART : b.t && !b.effroi ? VITESSE : VOL_LIBRE);
      if (b.away) { if (offscreen(b)) continue; b.vx += b.ex * 0.14 * k; b.vy += b.ey * 0.14 * k; const v = Math.hypot(b.vx, b.vy); if (v > 4.5) { b.vx = b.vx / v * 4.5; b.vy = b.vy / v * 4.5; } b.x += b.vx * k; b.y += b.vy * k; continue; }
      let fx = 0, fy = 0;
      // le défilement va plus vite que les oiseaux : ceux qui décrochent rentrent par le bord le plus proche
      if (!b.t) {
        if (b.y < scrollY - 220) { b.y = scrollY - 30; b.vy = Math.abs(b.vy) + 1; }
        else if (b.y > scrollY + vh + 220) { b.y = scrollY + vh + 30; b.vy = -Math.abs(b.vy) - 1; }
      } else {
        const ty = b.t[1] + org[1];
        if (Math.abs(b.y - ty) > vh * 0.9) { b.y = ty + (b.y < ty ? -vh * 0.6 : vh * 0.6); }
      }
      const tx = b.t ? b.t[0] + org[0] : 0, ty = b.t ? b.t[1] + org[1] : 0;
      if (b.effroi && b.t && (ms < b.effroi || (mx != null && Math.hypot(tx - mx, ty - my) < 90))) {
        // effrayé : il tourne au-dessus de sa place tant que la souris est là, puis revient s’y poser
        if (ms >= b.effroi) b.effroi = ms + 300;
        const px = tx + Math.cos(now * 1.6 + b.ph) * 36, py = ty - 64 + Math.sin(now * 2.1 + b.ph) * 18;
        fx = (px - b.x) * 0.006 - b.vx * 0.04; fy = (py - b.y) * 0.006 - b.vy * 0.04;
      } else if (b.t) {
        b.effroi = 0;
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
        if (d < 1.2) { b.perched = true; b.x = b.t[0] + org[0]; b.y = b.t[1] + org[1]; b.vx = b.vy = 0; continue; }
        const sp = Math.min(d > 300 ? 12 : 5.5, d * 0.08);
        // en chemin, la nuée tourne un peu sur elle-même avant de se poser
        const tour = Math.min(0.75, Math.max(0, (d - 50) / 380)), ca = Math.cos(tour), sa = Math.sin(tour), ux = dx / d, uy = dy / d;
        fx = (ux * ca - uy * sa) * sp - b.vx; fy = (ux * sa + uy * ca) * sp - b.vy;
        const lim = d > 300 ? 1.2 : 0.45, f = Math.hypot(fx, fy); if (f > lim) { fx = fx / f * lim; fy = fy / f * lim; }
      } else {
        let sx = 0, sy = 0, axx = 0, ayy = 0, cx = 0, cy = 0, n = 0;
        const gx = Math.floor(b.x / 40), gy = Math.floor(b.y / 40);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = grille.get((gx + i) * 100003 + gy + j); if (l) for (const o of l) {
          if (o === b) continue;
          const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 1600) { n++; axx += o.vx; ayy += o.vy; cx += o.x; cy += o.y; if (d2 < 420) { const d = Math.sqrt(d2) || 1; sx -= dx / d * (1 - d / 20.5); sy -= dy / d * (1 - d / 20.5); } }
        } }
        if (n) { fx += (axx / n - b.vx) * 0.05 + (cx / n - b.x) * 0.0007; fy += (ayy / n - b.vy) * 0.05 + (cy / n - b.y) * 0.0007; }
        if (b.orb && O) {
          // comme la nuée entière : un point d’attraction qui se promène dans la zone, et les règles de l’essaim font le reste
          let px, py;
          if (O.chemin) { [px, py] = O.point; b.loin = Math.hypot(b.x - px, b.y - py) > 220; }
          else {
            px = O.x + Math.cos(now * 0.33) * O.rx * 0.7 + Math.cos(now * 0.87) * O.rx * 0.2; py = O.y + Math.sin(now * 0.51) * O.ry * 0.7 + Math.sin(now * 1.13) * O.ry * 0.2;
            b.loin = Math.hypot((b.x - O.x) / O.rx, (b.y - O.y) / O.ry) > 1.8;
          }
          const attrait = b.loin ? 0.004 : 0.0011;
          fx += sx * 0.35 + (px - b.x) * attrait; fy += sy * 0.35 + (py - b.y) * attrait;
        } else { fx += sx * 0.35 + (ax - b.x) * 0.0006; fy += sy * 0.35 + (ay - b.y) * 0.0006; }
      }
      if (mx != null) { const dx = b.x - mx, dy = b.y - my, d2 = dx * dx + dy * dy; if (d2 < 7000 && (!b.t || b.effroi)) { const d = Math.sqrt(d2) || 1, f = (1 - d / 84) * 1.4; fx += dx / d * f; fy += dy / d * f; } }
      b.vx += fx * k; b.vy += fy * k;
      const v = Math.hypot(b.vx, b.vy), vmax = b.effroi ? 3.2 : b.t ? 12 : b.orb && b.loin ? 9 : 3.2, vmin = b.t && !b.effroi ? 0 : 1.3;
      if (v > vmax) { b.vx = b.vx / v * vmax; b.vy = b.vy / v * vmax; } else if (v < vmin && v > 0) { b.vx = b.vx / v * vmin; b.vy = b.vy / v * vmin; }
      b.x += b.vx * k; b.y += b.vy * k;
    }
    draw(now);
  }
  function draw(now = 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, vw, vh);
    ctx.translate(-scrollX, -scrollY); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of B) {
      if (offscreen(b)) continue;
      if (b.perched) {
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(b.x - 104 * S, b.y - 195 * S); ctx.scale(S, S); ctx.fillStyle = b.c; ctx.fill(SIL); ctx.restore();
      } else if (!reduced) {
        ctx.globalAlpha = b.t ? 0.95 : 0.5;
        const w = Math.sin(now * 16 + b.ph) * 2.4; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) * 0.25);
        ctx.strokeStyle = b.c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, w); ctx.quadraticCurveTo(-2.4, -1.2, 0, 0.9); ctx.quadraticCurveTo(2.4, -1.2, 5, w); ctx.stroke(); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (opts.debug) dessinerDebug();
  }
  // ?debug : les places (croix), la zone où tourne l’essaim (ellipse ou chemin) et son point d’attraction
  function dessinerDebug() {
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#C8612E'; ctx.fillStyle = '#C8612E';
    for (const b of B) if (b.t) { const x = b.t[0] + org[0], y = b.t[1] + org[1]; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2); ctx.stroke(); }
    if (O) {
      ctx.setLineDash([4, 4]); ctx.beginPath();
      if (O.chemin) O.chemin.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      else ctx.ellipse(O.x, O.y, O.rx, O.ry, 0, 0, Math.PI * 2);
      ctx.stroke(); ctx.setLineDash([]);
      if (O.point) { ctx.beginPath(); ctx.arc(O.point[0], O.point[1], 4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  // au repos (tous posés, rien ne bouge) on ne recalcule plus : on redessine seulement au défilement ou au redimensionnement
  let calme = false, besoin = true;
  const reveil = () => { besoin = true; };
  addEventListener('scroll', reveil, { passive: true }); addEventListener('resize', reveil);
  // Le pas suit le temps réel, pas le nombre d’images : même vitesse à 60, 120 ou 144 Hz.
  // Plafonné à 3 images pour qu’un à-coup (onglet ralenti, ramasse-miettes) ne téléporte pas la nuée.
  let tPrec = 0;
  const loop = (t) => {
    const pas = tPrec ? Math.min(3, (t - tPrec) / (1000 / 60)) : 1; tPrec = t;
    if (running && (!calme || besoin)) { besoin = false; step(pas); calme = B.every((b) => (b.perched && !b.attente) || (b.away && offscreen(b))); }
    raf = requestAnimationFrame(loop);
  };
  if (reduced) { addEventListener('scroll', () => { if (ancre) { org = ancre(); B.forEach((b) => { if (b.perched && b.t) { b.x = b.t[0] + org[0]; b.y = b.t[1] + org[1]; } }); } draw(); }, { passive: true }); draw(); } else loop();
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  return {
    perch, fly, scatter,
    get mode() { return mode; },
    setColors(c) { calme = false; colors = c; B.forEach((b, k) => { b.c = colors[k % colors.length]; }); if (reduced) draw(); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
  };
}
