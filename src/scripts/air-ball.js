/* Air ball (page 404) : le tir part de la gauche, trop long, passe au-dessus de l’oiseau, du cercle et du poteau
   sans rien toucher, et sort du cadre. Boucle lente, toutes les 6 s. Sans animation : l’illustration fixe. */
const BOUCLE = 6000;
// Trajectoire dans les coordonnées de l’illustration : départ, arrivée, sommet de la parabole (y), durée en ms.
// Vérifiée par le calcul : le ballon passe à 9 unités au-dessus du poteau et à 23 au-dessus de la tête de l’oiseau.
const DEPART = [-10, 150], ARRIVEE = [380, 300], SOMMET = -45, DUREE = 1500;

export function airBall(ballon) {
  if (!ballon || !ballon.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const [[x0, y0], [x1, y1]] = [DEPART, ARRIVEE], h = Math.min(y0, y1) - SOMMET, pas = Math.round(DUREE / 33);
  const images = [];
  for (let i = 0; i <= pas; i++) {
    const t = i / pas, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - 4 * h * t * (1 - t);
    images.push({ offset: (DUREE * t) / BOUCLE, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${i * 12}deg)` });
  }
  images.push({ offset: 1, transform: images[images.length - 1].transform });
  ballon.style.transformBox = 'view-box';
  ballon.style.transformOrigin = '0 0';
  ballon.animate(images, { duration: BOUCLE, iterations: Infinity, delay: 400, fill: 'backwards' });
}
