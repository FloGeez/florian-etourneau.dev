/* Le battement d’ailes d’un oiseau en vol (le groupe SVG .vol-dedans, .vol-pres, .vol-loin) : l’envol de Florian et son arrivée au nid.
   Les ailes battent au rythme du temps ; le défilement ne pilote que la trajectoire.
   L’étourneau bat en montant et plane en piquant (plane → 1, ailes tenues à tPlane). */
import { ailesVol, bobVol, avancerVol } from './oiseau.js';
import { animer } from './horloge.js';

const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function battement(g) {
  const pres = g.querySelector('.vol-pres'), loin = g.querySelector('.vol-loin'), dedans = g.querySelector('.vol-dedans');
  const st = { c: 0, plane: 0, cible: 0, tPlane: 0.3, actif: false };
  const dessiner = () => {
    const a = ailesVol(st.c, st.plane, st.tPlane);
    pres.setAttribute('d', a.pres); loin.setAttribute('d', a.loin);
    dedans.setAttribute('transform', `translate(0 ${bobVol(st.c, st.plane).toFixed(2)})`);
  };
  const maj = (dt) => {
    if (!st.actif) return false;
    avancerVol(st, dt, st.cible);
    dessiner();
    if (st.chaqueImage) st.chaqueImage(dt);
  };
  return { st, dessiner, demarrer() { if (st.actif || reduit) return; st.actif = true; animer(maj); }, arreter() { st.actif = false; } };
}
