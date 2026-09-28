/* L’envol de Florian, avec la nuée. Le vol suit le sens de lecture : l’oiseau décolle, puis plonge vers la suite de la page
   (en bas à droite de l’écran). Le trajet est défini à l’écran, puis ramené dans les coordonnées de la scène. */
import { courbes, clamp, lerp, placerVol } from './oiseau.js';
import { battement } from './vol.js';

const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bez = (P, u) => { const a = 1 - u; return [0, 1].map((k) => a * a * a * P[0][k] + 3 * a * a * u * P[1][k] + 3 * a * u * u * P[2][k] + u * u * u * P[3][k]); };

// Renvoie envol() : à appeler au défilement
export function initEnvol({ scene, VB, seuilEnvol, tir }) {
  const pose = document.getElementById('oiseau-pose'), vol = document.getElementById('oiseau-vol');
  const ailesEnvol = battement(vol);
  const KO_POSE = 130 / 140; // échelle de l’oiseau posé dans la scène : l’oiseau en vol part à la même taille
  let decolle = false, relais = null, volP = 0;
  function placerEnVol() {
    const r = scene.getBoundingClientRect(), k = r.width / VB.w, W = innerWidth, H = innerHeight;
    // la trajectoire part de la poitrine de l’oiseau au relais, puis plonge vers la suite de la page
    const depart = [r.left + (relais.poitrine[0] - VB.x) * k, r.top + (relais.poitrine[1] - VB.y) * k];
    const P = [depart, [depart[0] + W * 0.08, depart[1] - H * 0.14], [W * 0.78, H * 0.3], [W * 1.08, H * 0.78]];
    const u = clamp((volP - relais.p0) / (1 - relais.p0), 0, 1), [X, Y] = bez(P, u), [X2, Y2] = bez(P, Math.min(1, u + 0.01));
    const cible = [(X - r.left) / k + VB.x, (Y - r.top) / k + VB.y];
    const pente = Math.atan2(Y2 - Y, X2 - X) * 180 / Math.PI;
    // juste après le relais, l’oiseau part de l’inclinaison de l’oiseau posé (−48° : son axe), puis prend celle de la trajectoire (200 ms)
    const e = courbes.sortie(relais.t / 0.2), ang = lerp(-48, pente * 0.6, e), s = lerp(KO_POSE, 0.5, u);
    const [x, y] = placerVol(cible, ang, s);
    vol.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(3)}) translate(-114,-80)`);
    ailesEnvol.st.cible = pente > 15 ? 1 : 0;
  }
  ailesEnvol.st.chaqueImage = (dt) => { if (relais && relais.t < 0.2) { relais.t = Math.min(0.2, relais.t + dt); placerEnVol(); } };
  function envol() {
    if (reduit) return;
    const seuil = seuilEnvol();
    volP = Math.min(1, Math.max(0, (scrollY - seuil) / (innerHeight * 0.6)));
    const parti = scrollY > seuil;
    if (parti !== decolle) {
      decolle = parti; relais = null;
      tir.envol(parti, (poitrine) => { if (!decolle) return; relais = { poitrine, p0: Math.min(volP, 0.9), t: 0 }; ailesEnvol.st.c = 0; ailesEnvol.st.plane = 0; envol(); });
    }
    const enVol = parti && relais && volP < 1;
    pose.style.visibility = parti && relais ? 'hidden' : 'visible';
    vol.toggleAttribute('hidden', !enVol);
    if (!enVol) { ailesEnvol.arreter(); return; }
    placerEnVol();
    ailesEnvol.demarrer();
  }
  envol();
  return envol;
}
