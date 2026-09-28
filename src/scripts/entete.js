/* L’en-tête se marque dès qu’on quitte le haut de la page */
export function initEntete() {
  const entete = document.querySelector('.entete');
  const surDefile = () => entete.classList.toggle('defile', scrollY > 8);
  addEventListener('scroll', surDefile, { passive: true }); surDefile();
}
