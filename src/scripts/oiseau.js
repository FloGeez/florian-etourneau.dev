/* Copie de etourneau-identite/animations/oiseau.js — ne pas modifier ici : node outils/copier-tokens.mjs la met à jour (outil local). */
/* Étourneau — le mouvement.
   Géométrie articulée et fonctions pures pour animer l’oiseau de la charte.
   Aucune dépendance, aucun accès au DOM : chaque fonction rend des tracés SVG (attribut d) ou des transformations.
   Repères : oiseau posé dans le viewBox « 40 24 140 176 », oiseau en vol dans son repère d’origine (centre ≈ 114, 80). */

/* ——— Outils ——— */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const bump = (t) => Math.sin(Math.PI * clamp(t, 0, 1));
export const rotP = (p, deg, c) => {
  const r = deg * Math.PI / 180, co = Math.cos(r), si = Math.sin(r), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * co - dy * si, c[1] + dx * si + dy * co];
};
const f = (n) => n.toFixed(2);
/** Points [départ, (c1, c2, fin)…] → tracé fermé en courbes de Bézier cubiques. */
export const tracer = (P) => {
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 1; i < P.length; i += 3) d += `C${f(P[i][0])} ${f(P[i][1])} ${f(P[i + 1][0])} ${f(P[i + 1][1])} ${f(P[i + 2][0])} ${f(P[i + 2][1])}`;
  return d + 'Z';
};

/* ——— Courbes ——— */
export const courbes = {
  douce: (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); },
  entreeSortie: (t) => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  sortie: (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3),
  entree: (t) => Math.pow(clamp(t, 0, 1), 3),
  /** sortie avec dépassement ; k ≈ 1,3 pour l’aile, 2,2 pour le redressement à l’atterrissage */
  depassement: (t, k = 1.3) => { t = clamp(t, 0, 1); const c = k + 1; return 1 + c * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); },
};

/* ——— Oiseau posé ——— */
export const POSE = {
  CORPS: 'M140 48 C132 34 108 32 98 46 C88 60 86 80 84 100 C82 130 70 160 52 192 L68 194 C80 176 92 164 102 156 C130 146 150 120 146 88 C145 78 143 70 140 66 Z',
  VENTRE: 'M98 176 C100 136 120 108 164 98 L200 98 L200 200 L98 200 Z',
  BEC: 'M138 49 L172 59 L139 65 Z',
  BEC_FACE: 'M114.5 60 L123.5 60 L119 70 Z', // le bec vu de face, visible un instant quand la tête pivote
  OEIL: { cx: 125, cy: 54, r: 4.6 }, REFLET: { cx: 126.6, cy: 52.6, r: 1.4 },
  CRANE: { cx: 119, cy: 58, rx: 21, ry: 21 }, // crâne rond posé sur la silhouette, même couleur que le corps
  PIVOT_TETE: [119, 74],
  EPAULE: [96, 100],
  HANCHES: [[98, 150], [110, 146]], PIEDS: [[96, 192], [111, 192]], JAMBE: 42.05,
  DOIGTS: [[-5, 2], [5, 3]],
  POITRINE: [112, 105], // point de relais avec l’oiseau en vol
};

/* L’aile : la même aile passe de pliée (t = 0) à levée (t = 1) en tournant de −185,3° autour de l’épaule,
   par l’avant, comme un bras qu’on lève. Au-delà de 1, la rotation continue (dépassement). */
const PLIEE = [[94, 62], [118, 80], [122, 116], [106, 150], [89.3, 166], [72.7, 182], [56, 198], [65, 174], [71, 150.5], [76.5, 127.75], [82, 105], [87, 83], [94, 62]];
const LEVEE = [[82, 116], [70, 86], [72, 46], [94, 16], [104, 2], [116, -6], [130, -12], [124, 8], [116, 34], [114, 64], [113, 84], [108, 102], [100, 116]];
export const ANGLE_AILE = -185.3;
const LEVEE_RAMENEE = LEVEE.map((p) => rotP(p, -ANGLE_AILE, POSE.EPAULE));
/** Points de l’aile au temps t ; l’indice 6 est le bout de l’aile (la « main » qui tient le ballon). */
export const pointsAile = (t) => {
  const s = clamp(t, 0, 1);
  return PLIEE.map((p, i) => rotP(lp(p, LEVEE_RAMENEE[i], s), ANGLE_AILE * t, POSE.EPAULE));
};
export const aile = (t) => tracer(pointsAile(t));
export const BOUT_AILE = 6;
/** Au repos, l’aile pliée découpée dans le corps (charte) reste visible ; dès qu’elle bouge, une copie non découpée passe au premier plan. */
export const opaciteAileDessus = (t) => courbes.douce(Math.abs(t) / .12);

/** Transformation de la tête. sens : 1 regarde devant, −1 regarde derrière. penche : degrés (positif = bec vers le bas). */
export const transformTete = (sens, penche = 0) => {
  const [px, py] = POSE.PIVOT_TETE;
  return `rotate(${f(penche)} ${px} ${py}) translate(${px} 0) scale(${f(sens)} 1) translate(${-px} 0)`;
};
/** Opacités du bec de profil et du bec de face selon le sens de la tête. */
export const opacitesBec = (sens) => {
  const a = Math.abs(sens);
  return { profil: clamp((a - .12) / .3, 0, 1), face: 1 - clamp(a / .4, 0, 1) };
};
/** Durées en secondes. Miroir des tokens --fe-duration-* (tokens.json, groupe « duree ») : un module sans DOM ne lit pas le CSS,
    toute modification se fait des deux côtés. */
export const DUREES = { eclair: .13, courte: .25, moyenne: .45, longue: .65 };
export const DUREE_TETE = DUREES.eclair; // un oiseau tourne la tête d’un coup sec, puis la tient immobile

/** Pattes en deux segments (talon vers l’arrière) : hanches et pieds dans le repère de l’oiseau posé. */
export const pattes = (hanches, pieds, doigts = [0, 0]) => {
  const L = POSE.JAMBE; let d = '';
  for (let k = 0; k < 2; k++) {
    const h = hanches[k]; let p = pieds[k];
    let vx = p[0] - h[0], vy = p[1] - h[1], dd = Math.hypot(vx, vy);
    if (dd > L) { p = [h[0] + vx * L / dd, h[1] + vy * L / dd]; vx = p[0] - h[0]; vy = p[1] - h[1]; dd = L; }
    if (dd < L - .3) {
      const hh = Math.sqrt(L * L / 4 - dd * dd / 4); let nx = -vy / dd, ny = vx / dd; if (nx > 0) { nx = -nx; ny = -ny; }
      d += `M${f(h[0])} ${f(h[1])}L${f((h[0] + p[0]) / 2 + nx * hh)} ${f((h[1] + p[1]) / 2 + ny * hh)}L${f(p[0])} ${f(p[1])}`;
    } else d += `M${f(h[0])} ${f(h[1])}L${f(p[0])} ${f(p[1])}`;
    const a = rotP([p[0] + POSE.DOIGTS[0][0], p[1] + POSE.DOIGTS[0][1]], doigts[k], p);
    const b = rotP([p[0] + POSE.DOIGTS[1][0], p[1] + POSE.DOIGTS[1][1]], doigts[k], p);
    d += `M${f(a[0])} ${f(a[1])}L${f(p[0])} ${f(p[1])}L${f(b[0])} ${f(b[1])}`;
  }
  return d;
};

/* ——— Oiseau en vol ——— */
export const VOL = {
  CORPS: 'M150 70 C162 70 170 78 170 86 C166 100 156 108 142 112 C118 118 92 116 72 110 L34 126 L44 108 L28 100 L70 96 C86 84 110 76 132 74 C138 71 144 70 150 70 Z',
  VENTRE: 'M60 118 C96 98 136 96 180 90 L180 130 L60 130 Z',
  BEC: 'M166 80 L198 88 L167 94 Z',
  OEIL: { cx: 156, cy: 80, r: 4.4 }, REFLET: { cx: 157.6, cy: 78.6, r: 1.3 },
  CENTRE: [114, 80],
  POITRINE: [120, 92], // point de relais avec l’oiseau posé
  AXE: -16, // angle du corps en vol ; l’oiseau posé est à −64 (écart : 48°)
};
const PRES_H = [[104, 88], [96, 58], [102, 30], [120, 6], [122, 32], [128, 58], [130, 84]];
const PRES_B = [[106, 94], [104, 116], [112, 136], [132, 150], [126, 128], [124, 110], [130, 92]];
const LOIN_H = [[122, 80], [128, 54], [146, 30], [172, 16], [162, 40], [154, 62], [142, 82]];
const LOIN_B = [[126, 92], [134, 112], [148, 124], [170, 132], [160, 118], [152, 104], [146, 90]];
const RETARD = [0, .5, .8, 1, .8, .5, 0]; // le bout de l’aile suit avec du retard
export const BATTEMENT = { frequence: 4.2, descente: .42, retard: .12, bob: 2 };
const phase = (c) => { c = ((c % 1) + 1) % 1; const d = BATTEMENT.descente; return c < d ? Math.PI * c / d : Math.PI + Math.PI * (c - d) / (1 - d); };
const ouverture = (c) => (1 - Math.cos(phase(c))) / 2; // 0 : ailes en haut · 1 : ailes en bas

/**
 * Ailes en vol.
 * c : position dans le cycle de battement (avance de dt × fréquence, piloté par le temps, jamais par le scroll).
 * plane : 0 bat, 1 plane (ailes tenues à tPlane). tPlane : 0,3 pour un plané, 0,05 ailes levées pour freiner.
 */
export const ailesVol = (c, plane = 0, tPlane = .3) => {
  const tt = RETARD.map((w) => lerp(ouverture(c - BATTEMENT.retard * w), tPlane, plane));
  return {
    pres: tracer(PRES_H.map((p, i) => lp(p, PRES_B[i], tt[i]))),
    loin: tracer(LOIN_H.map((p, i) => lp(p, LOIN_B[i], tt[i]))),
  };
};
/** Le corps monte à chaque descente d’aile (en unités du repère de l’oiseau). amplitude : 2 par défaut, moins pour un oiseau qui bat vite. */
export const bobVol = (c, plane = 0, amplitude = BATTEMENT.bob) => -amplitude * Math.sin(phase(c)) * (1 - plane);

/**
 * Fait avancer un oiseau en vol d’un pas de temps dt (secondes), vers `cible` (0 bat, 1 plane).
 * etat : { c, plane } — modifié sur place ; c et plane se passent ensuite à ailesVol et bobVol.
 * En plané, l’oiseau tient ses ailes, sans reprise de battement.
 */
export const avancerVol = (etat, dt, cible) => {
  etat.cible = cible;
  etat.plane = (etat.plane || 0) + (cible - (etat.plane || 0)) * (1 - Math.exp(-dt * 10));
  if (etat.plane < .6) etat.c += dt * BATTEMENT.frequence;
  return etat;
};

/* ——— Placer les oiseaux ——— */
/** Corps de l’oiseau posé : dx, dy (unités), bascule (degrés, autour des hanches 104,150), sx, sy (écrasement).
    Rend la transformation du groupe du corps et une fonction qui transforme un point du même repère. */
export const CENTRE_CORPS = [104, 150];
export const corpsPose = ({ dx = 0, dy = 0, bascule = 0, sx = 1, sy = 1 } = {}) => {
  const [cx, cy] = CENTRE_CORPS;
  return {
    transform: `translate(${f(dx)} ${f(dy)}) rotate(${f(bascule)} ${cx} ${cy}) translate(${cx} ${cy}) scale(${f(sx)} ${f(sy)}) translate(${-cx} ${-cy})`,
    point: (p) => { let x = cx + (p[0] - cx) * sx, y = cy + (p[1] - cy) * sy; [x, y] = rotP([x, y], bascule, [cx, cy]); return [x + dx, y + dy]; },
  };
};
/** Pattes de l’oiseau posé quand son corps bouge : les hanches suivent le corps, les pieds restent où on les met. */
export const pattesPose = (etatCorps, pieds = POSE.PIEDS, doigts = [0, 0]) => {
  const c = corpsPose(etatCorps);
  return pattes(POSE.HANCHES.map(c.point), pieds, doigts);
};
/** Position (x, y) à donner à l’oiseau en vol — transform « translate(x y) rotate(rot) scale(s) translate(-114 -80) » —
    pour que son point local `local` tombe sur le point `monde`. */
export const placerVol = (monde, rot, s, local = VOL.POITRINE) => {
  const q = rotP([(local[0] - VOL.CENTRE[0]) * s, (local[1] - VOL.CENTRE[1]) * s], rot, [0, 0]);
  return [monde[0] - q[0], monde[1] - q[1]];
};

/* ——— Gestes au repos (possibles, pour les outils) ——— */
/** clignement : 0 → 1 → 0 en 140 ms à partir de debut (geste propre au repos, sans token) */
export const DUREE_CLIGNEMENT = .14;
export const clignement = (t, debut) => bump(seg(t, debut, debut + DUREE_CLIGNEMENT));
/** respiration : facteur d’échelle vertical */
export const respiration = (t, decalage = 0) => 1 + .01 * Math.sin(t * 2 * Math.PI / 3 + decalage);
