/* La géométrie de la planche de l’étape etourneau, comme sur la page de la marque (home/plate.js) : la branche et l’oiseau
   posé dessus, dans les unités de la planche (1000 × 640). Partagée par le dessin (Maintenant.astro) et la nuée (planche.js). */
export const BRANCHE = { x0: 40, x1: 960, y0: 560, cy: 588 };
export const brancheY = (x) => { const t = (x - BRANCHE.x0) / (BRANCHE.x1 - BRANCHE.x0); return BRANCHE.y0 + 2 * (BRANCHE.cy - BRANCHE.y0) * t * (1 - t); };
// l’oiseau à 2,5 ×, ses pieds (103,5 ; 192 de son repère) au milieu de la branche
export const K = 2.5, X0 = 500 - (103.5 - 40) * K, Y0 = brancheY(500) - 1 - (192 - 24) * K;
/** Du repère de l’oiseau (viewBox 40 24 140 176) aux unités de la planche. */
export const surPlanche = ([x, y]) => [X0 + (x - 40) * K, Y0 + (y - 24) * K];
