/* La planche de l’étape etourneau, comme sur la page de la marque : l’oiseau dessiné en grand dans la scène, et la légende
   de l’étape. Chaque partie est un paquet ; la choisir la fait bouger : la silhouette se dessine
   (brand), le plumage prend ses couleurs (tokens), l’oiseau se promène sur la branche (starling), et la nuée du site
   quitte la branche pour prendre la forme de l’oiseau (murmuration). Où se pose la nuée : scenes.js, par points() et variante(). */
import { easings, lerp, progress, bump, perchedBody, perchedLegs, headTransform, beakOpacities, HEAD_DURATION, PERCHED, animate } from '@etourneau/starling';
import { shapes, sampleShape } from '@etourneau/murmuration';
import { brancheY, surPlanche } from './planche-geometrie.js';

const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initPlanche() {
  const planche = document.querySelector('.planche');
  const etape = document.querySelector('.etape[data-forme="etourneau"]');
  const dessin = planche.querySelector('.planche-dessin');
  const marche = planche.querySelector('.planche-marche'), corps = planche.querySelector('.planche-corps'), pattes = planche.querySelector('.planche-pattes');
  const tete = planche.querySelector('.planche-tete'), crane = planche.querySelector('.planche-crane'), bec = planche.querySelector('.planche-bec'), becFace = planche.querySelector('.planche-bec-face');
  const boutons = [...etape.querySelectorAll('.planche-partie')];
  const legende = etape.querySelector('.planche-legende'), pilule = legende.querySelector('.planche-pilule'), fiches = [...etape.querySelectorAll('.planche-fiche')];
  let quandChange = () => {};

  // le fond glisse sous la tuile choisie ; il apparaît d’un coup sur sa première tuile, et se recale sans glisser (redimensionnement)
  const placerPilule = (instant = false) => {
    const b = boutons.find((x) => x.dataset.part === partie);
    if (!b) { pilule.style.opacity = '0'; return; }
    const sansGlisser = instant || pilule.style.opacity !== '1';
    pilule.classList.toggle('instant', sansGlisser);
    Object.assign(pilule.style, { transform: `translate(${b.offsetLeft}px, ${b.offsetTop}px)`, width: `${b.offsetWidth}px`, height: `${b.offsetHeight}px`, opacity: '1' });
    if (sansGlisser) requestAnimationFrame(() => requestAnimationFrame(() => pilule.classList.remove('instant')));
  };
  new ResizeObserver(() => placerPilule(true)).observe(legende);

  // sur petit écran, la planche passe au-dessus de l’étape, à la place réservée à la scène
  const petit = matchMedia('(max-width: 860px)');
  const placer = () => (petit.matches ? etape.querySelector('.etape-scene') : document.querySelector('.scene-nuee')).append(planche);
  placer(); petit.addEventListener('change', placer);

  /* iii : la promenade, comme dans la démo de @etourneau/starling. L’étourneau marche, il ne sautille pas : les pieds restent
     plantés pendant que le corps avance, la jambe plie au talon. Quelques pas à droite, il regarde derrière lui (la tête
     tourne seule, comme à l’accueil), fait demi-tour en suivant son regard, revient, se retourne. Dans le repère de l’oiseau (viewBox 40 24 140 176) ; choisir une autre partie le ramène vite à sa place. */
  const { smooth, inOut } = easings;
  const PAS = 12, VITESSE = 48, PIEDS = PERCHED.FEET;
  const PROGRAMME = [['marche', 40], ['regard'], ['demi-tour'], ['marche', 0], ['demi-tour']];
  const repos = () => ({ x: 0, sens: 1, tilt: 0, dy: 0, pieds: PIEDS.map((p) => p.slice()), doigts: [0, 0], tete: 1, penche: 0 });
  let o = repos(), etapeMarche = -1, tA = 0, distance = 0, depart = null, sensAvant = null, teteAvant = 1, pencheAvant = 0, enMarche = false;
  const dessinerOiseau = () => {
    marche.setAttribute('transform', `translate(${o.x.toFixed(2)} 0) translate(104 0) scale(${o.sens.toFixed(3)} 1) translate(-104 0)`);
    const c = { tilt: o.tilt, dy: o.dy };
    corps.setAttribute('transform', perchedBody(c).transform);
    pattes.setAttribute('d', perchedLegs(c, o.pieds, o.doigts));
    const t = headTransform(o.tete, o.penche), b = beakOpacities(o.tete);
    tete.setAttribute('transform', t); crane.setAttribute('transform', t);
    bec.style.opacity = b.profile.toFixed(3); becFace.style.opacity = b.front.toFixed(3);
  };
  const suivante = () => { etapeMarche++; tA = 0; depart = o.pieds.map((p) => p.slice()); teteAvant = o.tete; pencheAvant = o.penche; };
  const pas = (dt) => {
    const [action, cible] = PROGRAMME[etapeMarche];
    if (action === 'marche') {
      const reste = Math.abs(cible - o.x), avance = Math.min(reste, VITESSE * dt * smooth(Math.min(1, tA / 0.15)));
      o.x += Math.sign(cible - o.x) * avance; distance += avance;
      for (let k = 0; k < 2; k++) {
        const c = (distance / (2 * PAS) + k * 0.5) % 1;
        let ox, leve;
        if (c < 0.5) { ox = PAS / 2 - PAS * (c / 0.5); leve = 0; o.doigts[k] = 0; }
        else { const u = (c - 0.5) / 0.5; ox = -PAS / 2 + PAS * smooth(u); leve = 6 * Math.sin(Math.PI * u); o.doigts[k] = 22 * Math.sin(Math.PI * u); }
        o.pieds[k] = [PIEDS[k][0] + ox, PIEDS[k][1] - leve];
      }
      const p = (distance / PAS) % 1;
      o.tilt = 2.5 * Math.sin(2 * Math.PI * p) + 2; o.dy = 1.4 * (1 - Math.cos(2 * Math.PI * p)) / 2;
      if (reste - avance <= 0.01) suivante();
      return;
    }
    // les pieds reviennent sous le corps, en un petit pas
    if (depart) { const u = smooth(progress(tA, 0, 0.14)); o.pieds = depart.map((p, k) => [lerp(p[0], PIEDS[k][0], u), lerp(p[1], PIEDS[k][1], u) - 4 * bump(u) * (k === 0 ? 1 : 0)]); o.doigts = [0, 0]; if (u >= 1) depart = null; }
    if (action === 'regard') {
      // il s’arrête, puis tourne la tête d’un coup vers l’arrière, un peu penchée, et la garde
      o.tilt = lerp(o.tilt, 0, 1 - Math.exp(-dt * 14)); o.dy = lerp(o.dy, 0, 1 - Math.exp(-dt * 14));
      o.tete = lerp(1, -1, inOut(progress(tA, 0.3, 0.3 + HEAD_DURATION))); o.penche = -8 * smooth(progress(tA, 0.3, 0.6));
      if (tA > 1.3) suivante();
    } else {
      const u = progress(tA, 0.1, 0.42);
      if (u > 0 && sensAvant == null) sensAvant = o.sens;
      const s0 = sensAvant ?? o.sens;
      o.sens = s0 * Math.cos(Math.PI * inOut(u)); if (Math.abs(o.sens) < 0.06) o.sens = 0.06 * Math.sign(o.sens || -s0);
      o.dy = -9 * bump(u); o.tilt = lerp(o.tilt, -4 * bump(u), 0.3);
      // la tête garde son regard tant que le corps n’a pas basculé, puis se remet droite : le relais tombe quand l’oiseau est
      // vu de dos, aplati, et ne se voit pas
      o.tete = Math.sign(o.sens) === Math.sign(s0) ? teteAvant : 1; o.penche = lerp(pencheAvant, 0, smooth(u));
      o.pieds = PIEDS.map((p) => [p[0], p[1] - 5 * bump(u)]); o.doigts = [18 * bump(u), 18 * bump(u)];
      if (tA > 0.6) { o.sens = -s0; sensAvant = null; o.doigts = [0, 0]; suivante(); }
    }
  };
  // hors promenade, l’oiseau rentre à sa place en un quart de seconde
  const rentrer = (dt) => {
    const k = 1 - Math.exp(-dt * 14), d = repos();
    o.x = lerp(o.x, 0, k); o.sens = lerp(o.sens, 1, k); o.tilt = lerp(o.tilt, 0, k); o.dy = lerp(o.dy, 0, k); o.tete = lerp(o.tete, 1, k); o.penche = lerp(o.penche, 0, k);
    o.pieds = o.pieds.map((p, i) => [lerp(p[0], d.pieds[i][0], k), lerp(p[1], d.pieds[i][1], k)]); o.doigts = o.doigts.map((t) => lerp(t, 0, k));
    if (Math.abs(o.x) < 0.05 && Math.abs(1 - o.sens) < 0.005 && Math.abs(1 - o.tete) < 0.005) { o = d; return true; }
    return false;
  };
  const promener = (oui) => {
    if (reduit) return;
    if (oui) { o = repos(); etapeMarche = 0; tA = 0; distance = 0; depart = null; sensAvant = null; } else etapeMarche = -1;
    if (enMarche) return; enMarche = true;
    animate((dt) => {
      tA += dt;
      const fini = etapeMarche >= 0 && etapeMarche < PROGRAMME.length ? (pas(dt), false) : rentrer(dt);
      dessinerOiseau();
      if (fini) { enMarche = false; return false; }
    });
  };

  // à chaque arrivée sur l’étape : la nuée dessine d’abord l’oiseau (dessin caché), puis s’évapore pendant que la silhouette
  // se trace et que les couleurs reviennent ; en partant, la planche s’efface et se remet à zéro pour la prochaine fois
  let partie = '', nuee = false, relais = 0, remise = 0;
  const arriver = () => {
    clearTimeout(remise);
    if (partie) return; // revenu avant la fin du fondu : la planche est restée telle quelle
    if (reduit) { choisir('brand'); return; }
    nuee = true; planche.dataset.arrivee = 'nuee'; quandChange();
    relais = setTimeout(() => { nuee = false; planche.dataset.arrivee = 'dessin'; choisir('brand', true); }, 1900);
  };
  const partir = () => {
    clearTimeout(relais);
    remise = setTimeout(() => {
      nuee = false; partie = ''; delete planche.dataset.arrivee; planche.dataset.part = '';
      boutons.forEach((b) => b.setAttribute('aria-pressed', false)); etapeMarche = -1; o = repos(); dessinerOiseau(); placerPilule();
    }, 500);
  };
  const choisir = (nom, depuisLaNuee = false) => {
    if (nom === partie) return;
    if (!depuisLaNuee) { clearTimeout(relais); nuee = false; delete planche.dataset.arrivee; }
    partie = nom;
    planche.dataset.part = nom;
    boutons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.part === nom));
    fiches.forEach((f) => f.classList.toggle('active', f.dataset.part === nom));
    placerPilule();
    promener(nom === 'starling');
    quandChange();
  };
  boutons.forEach((b) => b.addEventListener('click', () => choisir(b.dataset.part)));
  // ← → passent d’une partie à l’autre, le focus suit
  legende.addEventListener('keydown', (e) => {
    const i = boutons.findIndex((b) => b.dataset.part === partie), vers = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1 }[e.key];
    if (vers == null) return;
    e.preventDefault();
    const b = boutons[(vers + boutons.length) % boutons.length];
    choisir(b.dataset.part); b.focus();
  });
  let actif = false;
  new MutationObserver(() => { const a = etape.classList.contains('actif'); if (a !== actif) { actif = a; (a ? arriver : partir)(); } })
    .observe(etape, { attributes: true, attributeFilter: ['class'] });

  // des unités de la planche aux points de la nuée, relatifs au coin du dessin (l’ancre de scenes.js)
  const versDessin = () => {
    const m = dessin.getScreenCTM(), r = dessin.getBoundingClientRect(), pt = dessin.createSVGPoint();
    const map = ([x, y]) => { pt.x = x; pt.y = y; const q = pt.matrixTransform(m); return [q.x - r.left, q.y - r.top]; };
    map.unite = m.a;
    return map;
  };
  const [vx, , vw] = dessin.getAttribute('viewBox').split(' ').map(Number);
  const surBranche = () => {
    const map = versDessin(), pts = [];
    for (const [a, b] of [[vx + 8, 336], [674, vx + vw - 8]]) for (let x = a; x < b; x += 13 / map.unite) pts.push(map([x, brancheY(x) - 1]));
    return pts;
  };
  // shapes.starling dessine le corps du logo à 3,4 × autour de (112, 115) du repère de l’oiseau, centré sur 720 × 640
  // (posés par leur milieu, pas par leurs pieds : centred, dans scenes.js)
  const dansOiseau = (n) => { const map = versDessin(); return sampleShape(shapes.starling, n).map(([x, y]) => map(surPlanche([112 + (x - 360) / 3.4, 115 + (y - 320) / 3.4]))); };

  const dansLaNuee = () => nuee || partie === 'murmuration' || (!reduit && !partie && etape.classList.contains('actif'));
  return {
    element: dessin,
    // l’étape vient de devenir l’étape en cours (avant même que l’observateur ne le voie) : la nuée dessine d’abord l’oiseau,
    // et y va droit depuis la forme précédente
    variante: () => (dansLaNuee() ? 'etourneau-nuee' : 'etourneau'),
    points: (n) => (dansLaNuee() ? dansOiseau(n) : surBranche()),
    set quandChange(f) { quandChange = f; },
  };
}
