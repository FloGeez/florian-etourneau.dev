/* Une seule boucle d’animation pour les oiseaux (tir, envol, retour au nid).
   animer(maj) : maj(dt) est appelée à chaque image, dt en secondes, borné à 50 ms. Elle renvoie false pour s’arrêter.
   La boucle s’endort dès que plus rien ne bouge. La nuée et le dribble gardent leur propre fonctionnement. */
const actifs = new Set();
let raf = 0, prec = 0;
const pas = (now) => {
  const dt = Math.min(0.05, Math.max(0, (now - prec) / 1000)); prec = now;
  for (const maj of [...actifs]) if (maj(dt) === false) actifs.delete(maj);
  raf = actifs.size ? requestAnimationFrame(pas) : 0;
};
export function animer(maj) {
  actifs.add(maj);
  if (!raf) { prec = performance.now(); raf = requestAnimationFrame(pas); }
  return () => actifs.delete(maj);
}
