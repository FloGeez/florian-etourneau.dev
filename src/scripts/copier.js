/* Copier l’adresse — le ballon rebondit et trace la coche. Sans presse-papiers, l’adresse est sélectionnée. */
export function initCopier() {
  const copier = document.getElementById('copier'), adresse = document.getElementById('adresse'), statut = document.getElementById('statut-copie');
  const libelle = copier.querySelector('span');
  let minuterieCopie = 0;
  const confirmer = (texte) => {
    clearTimeout(minuterieCopie);
    copier.classList.remove('copie'); void copier.offsetWidth; copier.classList.add('copie'); copier.parentNode.classList.add('copie-ok');
    libelle.textContent = texte; statut.textContent = texte === 'Copié' ? 'Adresse copiée' : 'Adresse sélectionnée';
    minuterieCopie = setTimeout(() => { copier.classList.remove('copie'); copier.parentNode.classList.remove('copie-ok'); libelle.textContent = 'Copier'; statut.textContent = ''; }, 2400);
  };
  copier.addEventListener('click', () => {
    const repli = () => { const sel = getSelection(), r = document.createRange(); r.selectNodeContents(adresse); sel.removeAllRanges(); sel.addRange(r); confirmer('Sélectionnée'); };
    try { navigator.clipboard.writeText(adresse.textContent.trim()).then(() => confirmer('Copié'), repli); } catch (err) { repli(); }
  });
}
