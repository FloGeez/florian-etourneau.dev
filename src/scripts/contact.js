/* Formulaire de contact : replié sous l’adresse, « Écrire un message » le déplie. Envoi sans recharger la page.
   Au succès, moment 08 de la charte « Message envoyé » : le formulaire se replie en enveloppe, un oiseau arrive
   de la gauche, la saisit en vol et disparaît à droite ; la confirmation prend la place du formulaire.
   Sans animation : le texte seul. Sans JS, le bouton et le formulaire restent masqués : l’adresse suffit. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ECHEC = 'L’envoi a échoué. Réessaie, ou écris-moi directement à l’adresse ci-dessus.';
const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Même règles que le serveur (src/pages/api/contact.ts), pour répondre sans attendre.
function verifier(f) {
  const nom = f.nom.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
  if (!nom) return ['nom', 'Indique ton nom.'];
  if (!EMAIL.test(email)) return ['email', email ? 'Cette adresse email ne semble pas valide.' : 'Indique ton adresse email.'];
  if (message.length < 10) return ['message', 'Ton message doit faire au moins 10 caractères.'];
  return null;
}

/* ——— Le vol de l’enveloppe ———
   Une seule boucle requestAnimationFrame d’environ 2,6 s, qui ne touche que des attributs SVG de la scène
   (une feuille, un rabat, l’oiseau et quelques points) ; elle s’arrête à la fin. */
const T = { feuille: 150, pliee: 650, rabat: 820, rebond: 950, entree: 450, prise: 1450, sortie: 2550, message: 2050 };
const lisse = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const borne = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const bezier = (p0, c, p1, u) => { const a = 1 - u; return [0, 1].map((k) => a * a * p0[k] + 2 * a * u * c[k] + u * u * p1[k]); };
const SVGNS = 'http://www.w3.org/2000/svg';

function envolEnveloppe({ pied, formulaire, scene, fin }) {
  const p = pied.getBoundingClientRect(), r = formulaire.getBoundingClientRect();
  const W = pied.clientWidth, H = pied.clientHeight, petit = innerWidth < 600;
  scene.setAttribute('width', W); scene.setAttribute('height', H); scene.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const feuille = scene.querySelector('#envoi-feuille'), rabat = scene.querySelector('#envoi-rabat'), lettre = scene.querySelector('#envoi-lettre');
  const oiseau = scene.querySelector('#envoi-oiseau'), trace = scene.querySelector('#envoi-trace');
  const haut = oiseau.querySelector('.ailes-haut'), bas = oiseau.querySelector('.ailes-bas');

  // La feuille part du formulaire et se plie en enveloppe, au centre du formulaire.
  const F = { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
  const E = { w: petit ? 36 : 44, h: petit ? 25 : 30 }; E.x = F.x + F.w / 2; E.y = F.y + F.h / 2;
  // L’oiseau (vol du logo, centre local 114,80 ; pointe du bec en 198,88) arrive pile sur le haut de l’enveloppe.
  const s = petit ? 0.46 : 0.56, bec = [84 * s, 8 * s];
  const B = [E.x - bec[0], E.y - E.h / 2 - bec[1] + 3];
  const entree = [[-140, B[1] - 150], [B[0] - 220, B[1]], B];
  const sortie = [B, [B[0] + 260, B[1] + 16], [W + 160, B[1] - 230]];

  trace.replaceChildren();
  rabat.style.strokeDashoffset = 1;
  oiseau.setAttribute('transform', `translate(-400 ${B[1]})`);
  scene.removeAttribute('hidden');
  formulaire.classList.add('se-plie');

  let t0 = null, dernierPoint = 0, message = false;
  const pas = (now) => {
    if (t0 === null) t0 = now;
    const t = now - t0;

    // 1. La feuille apparaît sur le formulaire, puis se plie en enveloppe.
    const k = lisse(borne((t - T.feuille) / (T.pliee - T.feuille)));
    const w = mix(F.w, E.w, k), h = mix(F.h, E.h, k);
    let cx = mix(F.x + F.w / 2, E.x, k), cy = mix(F.y + F.h / 2, E.y, k), rot = 0;
    const rebond = t > T.rabat && t < T.rebond ? 1 + 0.08 * Math.sin(Math.PI * (t - T.rabat) / (T.rebond - T.rabat)) : 1;
    feuille.setAttribute('x', -w / 2); feuille.setAttribute('y', -h / 2); feuille.setAttribute('width', w); feuille.setAttribute('height', h);
    feuille.setAttribute('rx', mix(10, 3, k));
    lettre.style.opacity = borne(t / T.feuille);
    feuille.style.strokeOpacity = mix(0.3, 1, k);
    rabat.setAttribute('d', `M${-w / 2 + 2} ${-h / 2 + 2} L0 ${-h / 2 + h * 0.56} L${w / 2 - 2} ${-h / 2 + 2}`);
    rabat.style.strokeDashoffset = 1 - borne((t - T.pliee) / (T.rabat - T.pliee));

    // 2. L’oiseau entre par la gauche, prend l’enveloppe sans s’arrêter, repart en montant vers la droite.
    let pos, ang = 0;
    if (t < T.prise) {
      const u = borne((t - T.entree) / (T.prise - T.entree));
      pos = bezier(...entree, u); const [x2, y2] = bezier(...entree, Math.min(1, u + 0.01));
      ang = Math.atan2(y2 - pos[1], x2 - pos[0]) * 180 / Math.PI * 0.6;
    } else {
      const v = borne((t - T.prise) / (T.sortie - T.prise)), u = v * (0.85 + 0.15 * v);
      pos = bezier(...sortie, u); const [x2, y2] = bezier(...sortie, Math.min(1, u + 0.01));
      ang = Math.atan2(y2 - pos[1], x2 - pos[0]) * 180 / Math.PI * 0.6;
      pos[1] += 5 * Math.sin(Math.PI * borne((t - T.prise) / 240)); // le poids de l’enveloppe, un court instant
      // l’enveloppe pend au bec et suit l’oiseau
      const a = (ang * Math.PI) / 180, bx = pos[0] + bec[0] * Math.cos(a) - bec[1] * Math.sin(a), by = pos[1] + bec[0] * Math.sin(a) + bec[1] * Math.cos(a);
      rot = ang * 0.5; const ar = (rot * Math.PI) / 180;
      cx = bx - Math.sin(ar) * (E.h / 2 - 3); cy = by + Math.cos(ar) * (E.h / 2 - 3);
      // la traînée de la charte : quelques points qui s’effacent
      if (t - dernierPoint > 80) {
        dernierPoint = t;
        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', cx.toFixed(1)); c.setAttribute('cy', cy.toFixed(1)); c.setAttribute('r', (1.4 + 1.8 * v).toFixed(2));
        trace.append(c);
        c.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 700, easing: 'ease-in', fill: 'forwards' }).onfinish = () => c.remove();
      }
    }
    oiseau.setAttribute('transform', `translate(${pos[0].toFixed(1)},${pos[1].toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s}) translate(-114,-80)`);
    const battement = Math.floor(t / (t > T.prise ? 70 : 90)) % 2 === 0; haut.toggleAttribute('hidden', !battement); bas.toggleAttribute('hidden', battement);
    lettre.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${rebond.toFixed(3)})`);

    // 3. La confirmation prend la place du formulaire pendant que l’oiseau s’éloigne.
    if (!message && t > T.message) { message = true; fin(); }
    if (t < T.sortie) requestAnimationFrame(pas);
    else { scene.setAttribute('hidden', ''); trace.replaceChildren(); formulaire.classList.remove('se-plie'); }
  };
  requestAnimationFrame(pas);
}

export function initContact(formulaire, ouvrir, envoi) {
  if (!formulaire || !ouvrir || !envoi) return;
  const pied = formulaire.closest('.pied'), zone = formulaire.closest('#contact-zone'), scene = document.getElementById('envoi-vol');
  const bouton = formulaire.querySelector('#envoyer'), libelle = bouton.querySelector('span');
  const statut = formulaire.querySelector('#statut-envoi'), texte = envoi.querySelector('#envoi-texte');
  const annoncer = (msg, etat) => { statut.textContent = msg; statut.dataset.etat = etat || ''; };
  let enVol = false;

  const marquer = (nom, msg) => {
    const champ = formulaire.elements[nom], aide = formulaire.querySelector(`#a-${nom}`);
    champ.toggleAttribute('aria-invalid', !!msg);
    aide.textContent = msg || '';
  };
  const effacer = () => ['nom', 'email', 'message'].forEach((n) => marquer(n));

  // Le formulaire laisse place à la confirmation ; la zone se resserre en douceur au lieu de sauter.
  const confirmer = () => {
    const h1 = zone.offsetHeight;
    formulaire.hidden = true; formulaire.reset(); envoi.hidden = false;
    ouvrir.setAttribute('aria-expanded', 'false');
    texte.focus({ preventScroll: true });
    if (reduit()) return;
    const h2 = zone.offsetHeight;
    zone.animate([{ height: `${h1}px` }, { height: `${h2}px` }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    texte.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 120, easing: 'ease-out', fill: 'backwards' });
  };

  ouvrir.hidden = false;
  ouvrir.addEventListener('click', () => {
    if (enVol) return;
    const ouvert = formulaire.hidden;
    formulaire.hidden = !ouvert; envoi.hidden = true;
    ouvrir.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) formulaire.elements.nom.focus();
  });
  // Une erreur disparaît dès qu’on corrige le champ.
  formulaire.addEventListener('input', (e) => { if (e.target.hasAttribute('aria-invalid')) marquer(e.target.name); });

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (bouton.disabled || enVol) return;
    effacer(); annoncer('');
    const faute = verifier(formulaire);
    if (faute) { marquer(...faute); formulaire.elements[faute[0]].focus(); return; }

    bouton.disabled = true; libelle.textContent = 'Envoi…';
    let resultat = { ok: false, erreur: ECHEC };
    try {
      const reponse = await fetch(formulaire.action, { method: 'POST', body: new FormData(formulaire), headers: { Accept: 'application/json' } });
      resultat = await reponse.json();
    } catch (err) { /* réseau coupé : on garde le message par défaut */ }
    libelle.textContent = 'Envoyer'; bouton.disabled = false;

    if (resultat.ok) {
      if (reduit() || !scene || !pied) { confirmer(); return; }
      enVol = true;
      envolEnveloppe({ pied, formulaire, scene, fin: () => { confirmer(); setTimeout(() => { enVol = false; }, 600); } });
      return;
    }
    if (resultat.champ && formulaire.elements[resultat.champ]) { marquer(resultat.champ, resultat.erreur); formulaire.elements[resultat.champ].focus(); }
    else annoncer(resultat.erreur || ECHEC, 'erreur');
  });
}
