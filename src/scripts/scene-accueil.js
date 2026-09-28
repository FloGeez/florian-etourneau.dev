/* La scène de l’accueil : le fil, l’oiseau et le panier. Son cadrage, sa place sous le texte, et le moment où l’oiseau s’envole.
   Partagée par la nuée (le fil), le tir et l’envol. */

// La scène, en unités du viewBox : le fil (Y0, flèche SAG), l’oiseau (BX), le panier (HX)
export const G = {"W": 1200, "Y0": 340, "SAG": 10, "BX": 720, "HX": 1030, "K": 0.95};

export function initSceneAccueil() {
  const scene = document.querySelector('.scene'), sceneAccueil = document.querySelector('.scene-accueil');
  /* Sur petit écran, on recadre la scène sur l’oiseau et le panier : tout est deux fois plus grand, le jeu devient jouable. */
  const VB = { x: 0, y: 40, w: 1200, h: 330 };
  const cadrer = () => {
    const serre = innerWidth < 700;
    Object.assign(VB, serre ? { x: 590, y: 40, w: 610, h: 330 } : { x: 0, y: 40, w: 1200, h: 330 });
    scene.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
    sceneAccueil.style.setProperty('--poteau-x', ((1089.4 - VB.x) / VB.w * 100).toFixed(2) + '%');
    sceneAccueil.style.setProperty('--panneau-bas', ((1 - (77.8 - VB.y) / VB.h) * 100).toFixed(2) + '%');
  };
  cadrer(); addEventListener('resize', cadrer);
  /* Sur grand écran, la scène remonte sous le texte : le fil doit être visible sans défiler,
     sans que l’oiseau, le ballon ou l’indice ne passent sous une ligne de texte. */
  const intro = document.querySelector('.accueil .intro');
  // les lignes réellement écrites (nœuds texte), pas les boîtes des éléments
  const lignesTexte = () => [document.querySelector('.accueil h1'), intro].flatMap((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), out = []; let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); out.push(...r.getClientRects()); }
    return out;
  });
  const placerScene = () => {
    if (innerWidth < 1000) { sceneAccueil.style.marginTop = ''; return; }
    sceneAccueil.style.marginTop = '0px';
    const s = sceneAccueil.getBoundingClientRect(), k = s.width / VB.w, haut0 = s.top + scrollY;
    const filY = (344 - VB.y) * k, finTexte = intro.getBoundingClientRect().bottom + scrollY;
    // où l’on voudrait le fil : juste au-dessus du bas de l’écran, jamais collé au texte
    const cible = Math.max(finTexte + 48, Math.min(innerHeight - 40, finTexte + 280));
    let haut = cible - filY;
    // l’oiseau, le ballon et l’indice (x de 640 à 1100 dans la scène) restent sous les lignes qu’ils croisent
    const gx = (640 - VB.x) * k + s.left, dx = (1100 - VB.x) * k + s.left, zoneHaut = (95 - VB.y) * k;
    lignesTexte().forEach((l) => { if (l.right > gx && l.left < dx) haut = Math.max(haut, l.bottom + scrollY + 8 - zoneHaut); });
    sceneAccueil.style.marginTop = Math.round(haut - haut0) + 'px';
  };
  placerScene(); addEventListener('resize', placerScene);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placerScene);
  // L’oiseau ne s’envole que lorsque sa scène commence à sortir par le haut
  const seuilEnvol = () => { const r = scene.getBoundingClientRect(); return Math.max(innerHeight * 0.2, r.top + scrollY + r.height * 0.45 - innerHeight * 0.3); };
  return { scene, VB, seuilEnvol };
}
