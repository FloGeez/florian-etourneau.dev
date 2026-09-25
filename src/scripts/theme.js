/* Bascule de thème (bouton de l’en-tête). Le thème mémorisé est déjà appliqué par Base.astro avant le rendu. */
const root = document.documentElement;
const systemeSombre = window.matchMedia('(prefers-color-scheme: dark)');
const estSombre = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemeSombre.matches);

/** Branche le bouton ; `quandChange` est appelé après chaque changement de thème (bouton ou système). */
export function initTheme(quandChange = () => {}) {
  const bouton = document.getElementById('bouton-theme');
  const majBouton = () => bouton.setAttribute('aria-label', estSombre() ? 'Passer en thème clair' : 'Passer en thème sombre');
  majBouton();
  bouton.addEventListener('click', () => {
    root.dataset.theme = estSombre() ? 'light' : 'dark';
    try { localStorage.setItem('fe-theme', root.dataset.theme); } catch (e) {}
    majBouton(); quandChange();
  });
  systemeSombre.addEventListener('change', () => { majBouton(); quandChange(); });
}
