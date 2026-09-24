/* La nuée — une murmuration d'étourneaux qui accompagne toute la page.
 * Un canvas fixe derrière le contenu ; les oiseaux vivent en coordonnées de document.
 *   const n = createNuee(canvas, { count: 170, colors: ['#5B2A9E', '#2A1245'] });
 *   n.perch(points)  // se poser sur une liste de points [x, y] (coordonnées document)
 *   n.fly()          // voler librement dans la marge du viewport
 *   n.scatter()      // quitter l'écran
 */
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
  addEventListener('pointermove', (e) => { mx = e.clientX + scrollX; my = e.clientY + scrollY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mx = null; });

  function takeOff(b) { b.attente = 0; b.orb = false; if (b.perched) { b.vy -= 2 + Math.random() * 1.5; b.vx += (Math.random() - 0.5) * 2; } b.perched = false; b.t = null; }
  function comeBack(b) { if (!b.away) return; b.away = false; b.x = scrollX + (Math.random() < 0.5 ? -20 : vw + 20); b.y = scrollY + vh * (0.1 + Math.random() * 0.4); }
  // reste : que font les oiseaux sans place ? 'voler' (défaut), 'doubler' (se serrer à côté d’un autre), 'partir'
  // anc : fonction qui renvoie l’origine [x, y] (document) des points T ; la forme suit alors un élément qui bouge (position sticky…)
  // orb : fonction qui renvoie l’ellipse {x, y, rx, ry} (document) où tournent les oiseaux sans place (reste = 'tourner')
  function perch(T, instant, reste = 'voler', anc = null, orb = null) {
    calme = false;
    mode = 'perch'; orbite = reste === 'tourner' ? orb : null;
    // la nuée se reforme : les oiseaux posés s’envolent l’un après l’autre, de gauche à droite
    const now = performance.now(), avant = B.map((b) => (b.perched && b.t && !reduced && !instant ? b.t : null));
    ancreAvant = ancre; orgAvant = ancre ? ancre() : [0, 0];
    ancre = anc; org = anc ? anc() : [0, 0];
    B.forEach((b) => { takeOff(b); comeBack(b); });
    const order = B.map((b, k) => k).sort((a, c) => B[a].x - B[c].x);
    const tg = [...T].sort((a, c) => a[0] - c[0]);
    const n = Math.min(tg.length, B.length), stride = B.length / n, pris = new Set();
    for (let j = 0; j < n; j++) { const k = order[Math.floor(j * stride)]; B[k].t = tg[j]; pris.add(k); }
    if (n && n < B.length) B.forEach((b, k) => {
      if (pris.has(k)) return;
      if (reste === 'doubler') { const p = tg[Math.floor(Math.random() * n)]; b.t = [p[0] + (Math.random() < 0.5 ? -4 : 4), p[1]]; }
      else if (reste === 'tourner' && orb) b.orb = true;
      else if (reste === 'partir') { b.away = true; const a = Math.atan2(b.y - (scrollY + vh / 2), b.x - (scrollX + vw / 2)); b.ex = Math.cos(a); b.ey = Math.sin(a) - 0.6; }
    });
    const attendent = B.map((b, k) => k).filter((k) => avant[k]).sort((a, c) => avant[a][0] - avant[c][0]);
    attendent.forEach((k, r) => { const b = B[k]; b.ot = avant[k]; b.attente = now + (r / attendent.length) * 500 + Math.random() * 140; b.perched = true; b.vx = b.vy = 0; });
    finAttente = now + 700;
    if (reduced || instant) { B.forEach((b) => { if (b.t) { b.x = b.t[0] + org[0]; b.y = b.t[1] + org[1]; b.perched = true; } }); draw(); }
  }
  function fly() { calme = false; mode = 'fly'; ancre = null; orbite = null; B.forEach((b) => { takeOff(b); comeBack(b); }); if (reduced) draw(); }
  function scatter() {
    calme = false;
    mode = 'away'; ancre = null; orbite = null;
    B.forEach((b) => { takeOff(b); b.away = true; const a = Math.atan2(b.y - (scrollY + vh / 2), b.x - (scrollX + vw / 2)); b.ex = Math.cos(a); b.ey = Math.sin(a) - 0.6; });
    if (reduced) draw();
  }
  function offscreen(b) { return b.x < scrollX - 60 || b.x > scrollX + vw + 60 || b.y < scrollY - 60 || b.y > scrollY + vh + 60; }
  function step() {
    const now = performance.now() / 1000;
    // zone de vol : la marge droite du viewport, un peu au-dessus du milieu
    const ax = scrollX + vw * (vw > 900 ? 0.86 : 0.66) + Math.cos(now * 0.33) * vw * 0.1;
    const ay = scrollY + vh * 0.3 + Math.sin(now * 0.51) * vh * 0.15;
    org = ancre ? ancre() : [0, 0];
    O = orbite ? orbite() : null;
    const ms = performance.now(); if (ancreAvant && ms < finAttente) orgAvant = ancreAvant();
    // voisinage : une grille de 40 px pour les oiseaux libres (la nuée compte plusieurs centaines d’oiseaux)
    grille.clear();
    for (const o of B) { if (o.perched || o.away || o.t) continue; const c = Math.floor(o.x / 40) * 100003 + Math.floor(o.y / 40); const l = grille.get(c); if (l) l.push(o); else grille.set(c, [o]); }
    for (const b of B) {
      if (b.perched) {
        if (b.attente) {
          if (ms < b.attente) { b.x = b.ot[0] + orgAvant[0]; b.y = b.ot[1] + orgAvant[1]; continue; }
          b.attente = 0; b.perched = false; b.vy = -(1.5 + Math.random() * 2); b.vx = (Math.random() - 0.5) * 2;
        } else { if (ancre && b.t) { b.x = b.t[0] + org[0]; b.y = b.t[1] + org[1]; } continue; }
      }
      if (b.away) { if (offscreen(b)) continue; b.vx += b.ex * 0.14; b.vy += b.ey * 0.14; const v = Math.hypot(b.vx, b.vy); if (v > 4.5) { b.vx = b.vx / v * 4.5; b.vy = b.vy / v * 4.5; } b.x += b.vx; b.y += b.vy; continue; }
      let fx = 0, fy = 0;
      // le défilement va plus vite que les oiseaux : ceux qui décrochent rentrent par le bord le plus proche
      if (!b.t) {
        if (b.y < scrollY - 220) { b.y = scrollY - 30; b.vy = Math.abs(b.vy) + 1; }
        else if (b.y > scrollY + vh + 220) { b.y = scrollY + vh + 30; b.vy = -Math.abs(b.vy) - 1; }
      } else {
        const ty = b.t[1] + org[1];
        if (Math.abs(b.y - ty) > vh * 0.9) { b.y = ty + (b.y < ty ? -vh * 0.6 : vh * 0.6); }
      }
      if (b.t) {
        const dx = b.t[0] + org[0] - b.x, dy = b.t[1] + org[1] - b.y, d = Math.hypot(dx, dy);
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
          const px = O.x + Math.cos(now * 0.33) * O.rx * 0.7 + Math.cos(now * 0.87) * O.rx * 0.2, py = O.y + Math.sin(now * 0.51) * O.ry * 0.7 + Math.sin(now * 1.13) * O.ry * 0.2;
          const rr = Math.hypot((b.x - O.x) / O.rx, (b.y - O.y) / O.ry); b.loin = rr > 1.8;
          const k = b.loin ? 0.004 : 0.0011;
          fx += sx * 0.35 + (px - b.x) * k; fy += sy * 0.35 + (py - b.y) * k;
        } else { fx += sx * 0.35 + (ax - b.x) * 0.0006; fy += sy * 0.35 + (ay - b.y) * 0.0006; }
      }
      if (mx != null) { const dx = b.x - mx, dy = b.y - my, d2 = dx * dx + dy * dy; if (d2 < 7000 && !b.t) { const d = Math.sqrt(d2) || 1, f = (1 - d / 84) * 1.4; fx += dx / d * f; fy += dy / d * f; } }
      b.vx += fx; b.vy += fy;
      const v = Math.hypot(b.vx, b.vy), vmax = b.t ? 12 : b.orb && b.loin ? 9 : 3.2, vmin = b.t ? 0 : 1.3;
      if (v > vmax) { b.vx = b.vx / v * vmax; b.vy = b.vy / v * vmax; } else if (v < vmin && v > 0) { b.vx = b.vx / v * vmin; b.vy = b.vy / v * vmin; }
      b.x += b.vx; b.y += b.vy;
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
  }
  // au repos (tous posés, rien ne bouge) on ne recalcule plus : on redessine seulement au défilement ou au redimensionnement
  let calme = false, besoin = true;
  const reveil = () => { besoin = true; };
  addEventListener('scroll', reveil, { passive: true }); addEventListener('resize', reveil);
  const loop = () => {
    if (running && (!calme || besoin)) { besoin = false; step(); calme = B.every((b) => (b.perched && !b.attente) || (b.away && offscreen(b))); }
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
