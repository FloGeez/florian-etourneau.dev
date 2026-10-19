/* Florian Etourneau — les formes que dessine la nuée dans « maintenant » (canevas 720 × 640) : l’histoire du site.
   On remplit (noir), on évide (destination-out) : les oiseaux remplissent la matière, la forme se lit
   par masse et par creux, comme une vraie murmuration. Chaque forme doit se lire en une seconde.
   Le panier et l’échantillonnage en points de pose viennent de @etourneau/murmuration. */
import { shapes, sampleShape, roundRect, solid, hollow, stroke } from '@etourneau/murmuration/shapes';

export const minuteRennes = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date());

export const FORMES = {
  // Au travail : la puce (le picto IA de la charte) avec du code dedans — le code, augmenté par l’IA
  travail: (g) => {
    solid(g); g.strokeStyle = '#000';
    roundRect(g, 190, 150, 340, 340, 44); g.fill();
    [250, 360, 470].forEach((p) => { roundRect(g, p - 16, 70, 32, 90, 12); g.fill(); roundRect(g, p - 16, 480, 32, 90, 12); g.fill(); roundRect(g, 110, p - 16 + 0, 90, 32, 12); g.fill(); roundRect(g, 520, p - 16, 90, 32, 12); g.fill(); });
    hollow(g); g.lineWidth = 34; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(315, 250); g.lineTo(255, 320); g.lineTo(315, 390); g.moveTo(405, 250); g.lineTo(465, 320); g.lineTo(405, 390); g.stroke();
    solid(g);
  },
  // Angular Tiptap Editor : son logo — le crayon croqué et les touches A T E
  editeur: (g) => {
    const police = `800 128px "Bricolage Grotesque", "Arial Black", system-ui, sans-serif`;
    solid(g);
    g.beginPath(); g.moveTo(100, 200); g.lineTo(178, 200); g.lineTo(98, 440); g.quadraticCurveTo(93, 452, 80, 452); g.lineTo(28, 452); g.quadraticCurveTo(14, 452, 19, 438); g.closePath(); g.fill();
    hollow(g); g.beginPath(); g.arc(178, 200, 22, 0, 6.2832); g.fill(); g.beginPath(); g.arc(184, 232, 16, 0, 6.2832); g.fill();
    solid(g);
    // touches en contour, lettres pleines : plus lisible avec peu d’oiseaux
    const touches = [[190, 'A'], [365, 'T'], [540, 'E']];
    g.strokeStyle = '#000'; g.lineWidth = 16;
    touches.forEach(([x]) => { roundRect(g, x + 8, 244, 148, 156, 32); g.stroke(); });
    g.font = police; g.textAlign = 'center'; g.textBaseline = 'middle';
    touches.forEach(([x, l]) => g.fillText(l, x + 82, 324));
  },
  // MaxDS CV : l’outil maison de MaxDS — son symbole (le carré, les trois points, le D)
  maxds: (g) => {
    const k = 440 / 520, X = (x) => 140 + (x - 1480) * k, Y = (y) => 100 + y * k, L = (v) => v * k;
    solid(g); roundRect(g, X(1480), Y(0), L(520), L(497), L(26)); g.fill();
    hollow(g);
    [[1585, 105], [1538, 216], [1585, 327]].forEach(([x, y]) => { g.beginPath(); g.rect(X(x), Y(y), L(66), L(66)); g.fill(); });
    g.beginPath(); g.moveTo(X(1693), Y(60)); g.lineTo(X(1727), Y(60)); g.arc(X(1727), Y(249), L(189), -Math.PI / 2, Math.PI / 2); g.lineTo(X(1693), Y(438)); g.lineTo(X(1693), Y(372)); g.lineTo(X(1727), Y(372));
    g.arc(X(1727), Y(249), L(123), Math.PI / 2, -Math.PI / 2, true); g.lineTo(X(1693), Y(126)); g.closePath(); g.fill();
    solid(g);
  },
  // Rennes : le repère, et dedans l’heure qu’il est là-bas
  rennes: (g, heure = new Date()) => {
    const [h, m] = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(heure).filter((p) => p.type !== 'literal').map((p) => +p.value);
    const cx = 360, cy = 250;
    solid(g); g.beginPath();
    g.moveTo(cx, 600); g.bezierCurveTo(cx - 80, 500, cx - 210, 380, cx - 210, 250); g.bezierCurveTo(cx - 210, 120, cx - 115, 40, cx, 40); g.bezierCurveTo(cx + 115, 40, cx + 210, 120, cx + 210, 250); g.bezierCurveTo(cx + 210, 380, cx + 80, 500, cx, 600); g.fill();
    hollow(g); g.beginPath(); g.arc(cx, cy, 128, 0, 6.2832); g.fill();
    solid(g); g.strokeStyle = '#000';
    const am = (m / 60) * 6.2832 - 1.5708, ah = ((h % 12) / 12 + m / 720) * 6.2832 - 1.5708;
    stroke(g, cx, cy, cx + Math.cos(am) * 100, cy + Math.sin(am) * 100, 30);
    stroke(g, cx, cy, cx + Math.cos(ah) * 66, cy + Math.sin(ah) * 66, 36);
    [0, 1, 2, 3].forEach((i) => { const a = i * 1.5708; stroke(g, cx + Math.cos(a) * 108, cy + Math.sin(a) * 108, cx + Math.cos(a) * 118, cy + Math.sin(a) * 118, 22); });
  },
  // Le panier et le ballon : la forme de la marque
  basket: shapes.basket,
};

/** Points où se posent les oiseaux pour dessiner la forme `nom`, autant que `nb` ; Rennes change à chaque minute (l’heure qu’il est là-bas). */
export const echantillon = (nom, nb) => sampleShape(FORMES[nom], nb, { key: nom === 'rennes' ? minuteRennes() : '' });
