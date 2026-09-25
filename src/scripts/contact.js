/* Formulaire de contact : replié sous l’adresse, « Écrire un message » le déplie. Envoi sans recharger la page.
   Au succès, moment 06 de la charte « Message envoyé » : l’oiseau s’envole avec l’enveloppe,
   la confirmation apparaît dessous. Sans animation : le texte seul.
   Sans JS, le bouton et le formulaire restent masqués : l’adresse suffit. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// L’envol : une courbe qui part du bas à gauche et sort en haut à droite, en battant des ailes,
// avec la traînée de points de la charte (ils grossissent vers l’oiseau).
const P = [[70, 112], [420, 150], [820, -60]], DUREE = 1600;
const courbe = (u) => { const a = 1 - u; return [0, 1].map((k) => a * a * P[0][k] + 2 * a * u * P[1][k] + u * u * P[2][k]); };
function envoler(scene) {
  const oiseau = scene.querySelector('#envoi-oiseau'), trace = scene.querySelector('#envoi-trace');
  const haut = oiseau.querySelector('.ailes-haut'), bas = oiseau.querySelector('.ailes-bas');
  trace.replaceChildren();
  let t0 = null, points = 0;
  const pas = (now) => {
    if (t0 === null) t0 = now;
    if (now < t0) now = t0;
    const r = Math.min(1, (now - t0) / DUREE), u = r * r * (1.6 - 0.6 * r);
    const [x, y] = courbe(u), [x2, y2] = courbe(Math.min(1, u + 0.01));
    const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI * 0.7;
    oiseau.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(0.55) translate(-114,-80)`);
    const h = Math.floor((now - t0) / 85) % 2 === 0; haut.toggleAttribute('hidden', !h); bas.toggleAttribute('hidden', h);
    // un point tous les 6 % du trajet, derrière l’oiseau
    while (points < 12 && u > 0.06 * (points + 1)) {
      const [px, py] = courbe(0.06 * points + 0.02), c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', px.toFixed(1)); c.setAttribute('cy', py.toFixed(1)); c.setAttribute('r', (1.2 + 0.22 * points).toFixed(2));
      trace.append(c); points++;
    }
    if (r < 1) requestAnimationFrame(pas); else oiseau.setAttribute('hidden', '');
  };
  pas(performance.now());
  oiseau.removeAttribute('hidden');
}

const ECHEC = 'L’envoi a échoué. Réessaie, ou écris-moi directement à l’adresse ci-dessus.';

// Même règles que le serveur (src/pages/api/contact.ts), pour répondre sans attendre.
function verifier(f) {
  const nom = f.nom.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
  if (!nom) return ['nom', 'Indique ton nom.'];
  if (!EMAIL.test(email)) return ['email', email ? 'Cette adresse email ne semble pas valide.' : 'Indique ton adresse email.'];
  if (message.length < 10) return ['message', 'Ton message doit faire au moins 10 caractères.'];
  return null;
}

export function initContact(formulaire, ouvrir, envoi) {
  if (!formulaire || !ouvrir || !envoi) return;
  const bouton = formulaire.querySelector('#envoyer'), libelle = bouton.querySelector('span');
  const statut = formulaire.querySelector('#statut-envoi');
  const annoncer = (texte, etat) => { statut.textContent = texte; statut.dataset.etat = etat || ''; };

  const marquer = (nom, texte) => {
    const champ = formulaire.elements[nom], aide = formulaire.querySelector(`#a-${nom}`);
    champ.toggleAttribute('aria-invalid', !!texte);
    aide.textContent = texte || '';
  };
  const effacer = () => ['nom', 'email', 'message'].forEach((n) => marquer(n));

  ouvrir.hidden = false;
  ouvrir.addEventListener('click', () => {
    const ouvert = formulaire.hidden;
    formulaire.hidden = !ouvert; envoi.hidden = true;
    ouvrir.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) formulaire.elements.nom.focus();
  });
  // Une erreur disparaît dès qu’on corrige le champ.
  formulaire.addEventListener('input', (e) => { if (e.target.hasAttribute('aria-invalid')) marquer(e.target.name); });

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (bouton.disabled) return;
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
      formulaire.reset(); formulaire.hidden = true; ouvrir.setAttribute('aria-expanded', 'false');
      envoi.hidden = false;
      envoi.querySelector('#envoi-texte').focus({ preventScroll: true });
      if (!reduit()) envoler(envoi.querySelector('#envoi-scene'));
      return;
    }
    if (resultat.champ && formulaire.elements[resultat.champ]) { marquer(resultat.champ, resultat.erreur); formulaire.elements[resultat.champ].focus(); }
    else annoncer(resultat.erreur || ECHEC, 'erreur');
  });
}
