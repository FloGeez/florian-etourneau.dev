/* Florian Etourneau — comportements du site. La nuée accompagne toute la lecture.
   Chaque moment a son module ; ici, on les branche dans l’ordre et on les fait suivre le défilement. */
import { initSceneAccueil } from './scene-accueil.js';
import { initNuee } from './scenes.js';
import { initEntete } from './entete.js';
import { initTir } from './tir.js';
import { initEnvol } from './envol.js';
import { initRennes } from './rennes.js';
import { initFamille } from './famille.js';
import { initCopier } from './copier.js';
import { initContact } from './contact.js';

const accueil = initSceneAccueil();      // le fil, l’oiseau et le panier
const nuee = initNuee(accueil);           // où se pose la nuée, section par section
initEntete();
const tir = initTir(accueil);             // à toi de tirer
const envol = initEnvol({ ...accueil, tir }); // Florian s’envole avec la nuée
initRennes();                             // l’heure et la météo
initFamille();                            // le retour au nid, le dribble
initCopier();
initContact(document.getElementById('formulaire'), document.getElementById('ecrire'), document.getElementById('envoi'));

// Au défilement, une fois par image : la nuée puis l’envol
let attente = false;
addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(() => { attente = false; nuee.maj(); envol(); }); } }, { passive: true });
