/* Florian Etourneau — les formes que dessine la nuée (canevas 720 × 640) et leur échantillonnage en points de pose.
   On remplit (noir), on évide (destination-out) : les oiseaux remplissent la matière, la forme se lit
   par masse et par creux, comme une vraie murmuration. Chaque forme doit se lire en une seconde. */
export const FORMES = (() => {
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const plein = (g) => { g.globalCompositeOperation = 'source-over'; };
const creux = (g) => { g.globalCompositeOperation = 'destination-out'; };
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
  // MaxDS CV : l’outil maison de MaxDS — son symbole (le carré, les trois points, le D)
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
export const minuteRennes = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date());
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
/** Points où se posent les oiseaux pour dessiner la forme `nom` (canevas 720 × 640), autant que `nb` : le contour, serré, pour la lisibilité ; l’intérieur, clairsemé, pour la matière. */
export const echantillon = (nom, nb) => {
  const cle = (nom === 'rennes' ? nom + minuteRennes() : nom) + '/' + nb;
  if (cacheFormes[cle]) return cacheFormes[cle];
  const d = masque(nom); let bas = 4, haut = 64, meilleur = remplir(d, 30);
  for (let i = 0; i < 8; i++) { const D = (bas + haut) / 2, p = remplir(d, D); if (p.length > nb) bas = D; else { haut = D; meilleur = p; } }
  if (policePrete()) cacheFormes[cle] = meilleur;
  return meilleur;
};
