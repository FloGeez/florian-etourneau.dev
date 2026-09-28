/* Le moteur de la nuée : chaque section de la page décrit une scène ; le moteur choisit celle qui est à l’écran et y pose la nuée.
 *
 *   const moteur = creerMoteur(nuee, [
 *     { nom: 'fil', active: () => scrollY < 300, pose: () => ({ places: pointsFil(), reste: 'tourner', zone: orbite }) },
 *     …
 *   ]);
 *   moteur.maj()      // au défilement : change de scène si besoin
 *   moteur.maj(true)  // la page a bougé (redimensionnement, polices) : on repose la nuée sur la scène en cours
 *
 * Une scène :
 *   nom : son nom (affiché avec ?debug)
 *   active() : vrai quand la scène est à l’écran ; la première scène active, dans l’ordre du tableau, l’emporte
 *   variante() : facultatif, pour une scène qui change sans qu’on défile (le picto de l’étape en cours) ; le moteur la
 *                revoit deux fois par seconde et repose la nuée quand elle change
 *   pose({ variante, premiere, force, meme }) : les points où se poser (places) et les options de nuee.perch (reste, zone,
 *                ancre, garder, farouches, instant). Par défaut, la nuée se pose d’un coup à la première scène, ou quand
 *                on repose la même scène de force ; sinon elle vole jusqu’à ses places.
 * Aucune scène active : la nuée vole librement.
 */
export function creerMoteur(nuee, scenes, { debug = false } = {}) {
  let cle = '', courante = null, premiere = true;
  const etiquette = debug ? creerEtiquette() : null;

  function maj(force = false) {
    const scene = scenes.find((s) => s.active());
    const variante = scene && scene.variante ? scene.variante() : '';
    const c = scene ? scene.nom + (variante ? ':' + variante : '') : 'vol';
    if (c !== cle || force) {
      const meme = c === cle;
      cle = c; courante = scene;
      if (!scene) nuee.fly();
      else {
        const { places, ...options } = scene.pose({ variante, premiere, force, meme });
        nuee.perch(places, { instant: premiere || (force && meme), ...options });
      }
      if (etiquette) etiquette.textContent = c;
    }
    premiere = false;
  }
  setInterval(() => { if (courante && courante.variante) maj(); }, 500);

  return { maj, get scene() { return courante ? courante.nom : 'vol'; } };
}

// ?debug : le nom de la scène en cours, en bas à gauche
function creerEtiquette() {
  const e = document.createElement('div');
  e.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;padding:4px 8px;border-radius:6px;background:#1C1426;color:#FF8A3D;font:500 12px/1.4 "JetBrains Mono",monospace;pointer-events:none';
  document.body.append(e);
  return e;
}
