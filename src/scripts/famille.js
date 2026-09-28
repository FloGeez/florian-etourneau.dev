/* La famille sur le fil du pied de page : le retour au nid de Florian, le cadrage sur petit écran, le dribble du fils du milieu. */
import { aile, opaciteAileDessus, courbes, lerp, seg, bump, corpsPose, pattesPose, placerVol, POSE } from './oiseau.js';
import { animer } from './horloge.js';
import { battement } from './vol.js';

const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initFamille() {
  const famille = document.querySelector('.famille');

  /* Retour au nid : Florian traverse la page, plane ailes levées, se redresse et se pose avec sa famille.
     Au relais, l’oiseau en vol et l’oiseau du nid se superposent (aile levée, corps penché) : on passe de l’un à l’autre sur une image. */
  const nid = document.getElementById('nid');
  const arrivee = document.getElementById('oiseau-vol').cloneNode(true);
  arrivee.id = 'oiseau-arrivee';
  arrivee.querySelectorAll('clipPath').forEach((c) => { const ancien = c.id; c.id = ancien + '-a'; arrivee.querySelectorAll(`[clip-path="url(#${ancien})"]`).forEach((n) => n.setAttribute('clip-path', `url(#${c.id})`)); });
  arrivee.setAttribute('hidden', '');
  nid.parentNode.insertBefore(arrivee, nid.nextSibling);
  const ailesArrivee = battement(arrivee);
  // l’oiseau du nid, articulé (même repère que la charte, placé à x 576,5 / y 77, échelle 104/140)
  const corpsNid = document.getElementById('corps-nid'), pattesNid = document.getElementById('pattes-nid');
  const aileNid = document.getElementById('aile-pliee-nid'), aileNidDessus = document.getElementById('aile-dessus-nid');
  const NID = { x: 576.5, y: 77, k: 104 / 140 };
  const versFamille = (p) => [NID.x + (p[0] - 40) * NID.k, NID.y + (p[1] - 24) * NID.k];
  function dessinerNid(e) {
    corpsNid.setAttribute('transform', corpsPose(e).transform);
    pattesNid.setAttribute('d', pattesPose(e, e.pieds, e.doigts));
    const d = aile(e.leve); aileNid.setAttribute('d', d); aileNidDessus.setAttribute('d', d);
    aileNidDessus.setAttribute('opacity', opaciteAileDessus(e.leve).toFixed(3));
  }
  // la pose du nid, t secondes après le relais : chute, contact (écrasement), redressement, repli de l’aile
  const poser = (t) => {
    const chute = courbes.entree(seg(t, 0, 0.22)), contact = seg(t, 0.22, 0.6), repli = courbes.entreeSortie(seg(t, 0.3, 0.75));
    return {
      dy: -16 * (1 - chute) + 4 * bump(contact) * (1 - contact * 0.4),
      bascule: 18 - 18 * courbes.depassement(seg(t, 0.1, 0.65), 2.2),
      sx: 1 + 0.04 * bump(contact), sy: 1 - 0.08 * bump(contact),
      leve: 1 - repli,
      pieds: POSE.PIEDS.map((q) => [q[0] + 8 * (1 - chute), q[1]]),
      doigts: [20 * (1 - chute), 20 * (1 - chute)],
    };
  };
  function atterrir() {
    const D = 1.9, POSE_FIN = 0.95, S0 = 0.82;
    // la poitrine de l’oiseau posé au moment du relais : la trajectoire y mène
    const cible = versFamille(corpsPose(poser(0)).point(POSE.POITRINE));
    const Q = [[-160, -70], [260, -120], [cible[0] - 88, cible[1] - 45], cible];
    const qpt = (u) => { const a = 1 - u; return [0, 1].map((k) => a * a * a * Q[0][k] + 3 * a * a * u * Q[1][k] + 3 * a * u * u * Q[2][k] + u * u * u * Q[3][k]); };
    let t = 0, relaye = false;
    arrivee.removeAttribute('hidden'); ailesArrivee.st.c = 0; ailesArrivee.st.plane = 0; ailesArrivee.st.tPlane = 0.05; ailesArrivee.demarrer();
    animer((dt) => {
      t += dt;
      if (!relaye) {
        const r = Math.min(1, t / D), u = 1 - Math.pow(1 - r, 2.2);
        const q = qpt(u), q2 = qpt(Math.min(1, u + 0.01));
        const tangente = Math.atan2(q2[1] - q[1], q2[0] - q[0]) * 180 / Math.PI;
        const ang = lerp(tangente * 0.5, -30, courbes.entreeSortie(seg(r, 0.8, 1))); // il se redresse pour freiner
        const s = lerp(S0, NID.k, u);
        ailesArrivee.st.cible = r > 0.7 ? 1 : 0; // plané ailes levées sur la fin
        const [x, y] = placerVol(q, ang, s);
        arrivee.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(3)}) translate(-114,-80)`);
        if (r >= 1) { relaye = true; t = 0; ailesArrivee.arreter(); arrivee.setAttribute('hidden', ''); nid.classList.remove('attend'); }
        return;
      }
      dessinerNid(poser(t));
      if (t >= POSE_FIN) { dessinerNid(poser(POSE_FIN + 1)); return false; }
    });
  }
  if (reduit || !('IntersectionObserver' in window)) nid.classList.remove('attend');
  else new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { obs.disconnect(); setTimeout(atterrir, 150); } }, { threshold: 0.55 }).observe(famille);

  /* Sur petit écran, on recadre la famille : sinon les oiseaux font la taille d’une fourmi */
  const cadrerFamille = () => famille.setAttribute('viewBox', innerWidth < 700 ? '470 50 720 180' : '0 0 1200 240');
  cadrerFamille(); addEventListener('resize', cadrerFamille);

  /* Le fils du milieu dribble quelques fois quand on arrive en bas, puis garde le ballon.
     Un clic (ou Entrée) sur lui relance le dribble. */
  const pied = document.querySelector('.pied'), dribbleur = document.getElementById('dribbleur'), dribble = document.querySelector('.dribble');
  const dribbler = () => { if (reduit) return; pied.classList.remove('dribble-on'); void dribble.getBBox(); pied.classList.add('dribble-on'); };
  dribble.addEventListener('animationend', (e) => { if (e.target === dribble) pied.classList.remove('dribble-on'); });
  dribbleur.addEventListener('click', dribbler);
  dribbleur.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dribbler(); } });
  if ('IntersectionObserver' in window) {
    let vu = false;
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !vu) { vu = true; setTimeout(dribbler, 1200); } else if (!en.isIntersecting) vu = false; }, { threshold: 0.4 }).observe(famille);
  }
}
