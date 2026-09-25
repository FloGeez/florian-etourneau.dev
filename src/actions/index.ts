// Actions du site (https://docs.astro.build/en/guides/actions/) : le formulaire de contact.
// `defi` donne au navigateur un petit calcul à résoudre (ALTCHA, preuve de travail, sans service tiers) ;
// `contact` valide les champs, vérifie la solution, puis envoie le message par Resend.
// Les deux sont protégées contre les requêtes d’autres sites (vérification d’origine d’Astro).
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { RESEND_API_KEY, ALTCHA_HMAC_KEY } from 'astro:env/server';
import { CappedMap, createChallenge, randomInt, verifySolution, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

const DESTINATAIRE = 'florian.etourneau@gmail.com';
const EXPEDITEUR = 'florian-etourneau.dev <contact@florian-etourneau.dev>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIEN = /https?:\/\/|www\./gi;
const INJOIGNABLE = 'écris-moi directement à l’adresse ci-dessus.';

/* ——— ALTCHA ———
   Le serveur tire un compteur secret, en dérive une clé (PBKDF2) et n’en publie que le début : le navigateur doit
   retrouver le compteur en essayant les valeurs une à une (environ 2 000 dérivations, moins d’une seconde sur
   ordinateur, pendant que le visiteur écrit). Le défi est signé avec ALTCHA_HMAC_KEY : impossible d’en fabriquer un.
   Sans clé en production, la vérification est ignorée (restent le pot de miel et la vérification d’origine) ;
   en local, une clé de développement la remplace. */
const CLE = ALTCHA_HMAC_KEY || (import.meta.env.DEV ? 'cle-de-developpement-altcha' : '');
const REGLAGES = { algorithm: 'PBKDF2/SHA-256', cost: 1000, deriveKey } as const;
const DUREE_DEFI = 30 * 60; // secondes : de quoi écrire un long message
// Une solution ne sert qu’une fois. Mémoire de la fonction : efficace tant qu’elle reste chaude, sans base de données.
const dejaUtilises = new CappedMap<string, true>({ maxSize: 2000 });

async function humain(charge: string | undefined) {
  if (!CLE) { console.warn('[contact] ALTCHA_HMAC_KEY manquante : vérification ignorée'); return true; }
  let challenge: Challenge, solution;
  try { ({ challenge, solution } = JSON.parse(charge ?? '')); } catch { return false; }
  if (!challenge?.signature || !solution || dejaUtilises.has(challenge.signature)) return false;
  const resultat = await verifySolution({ challenge, solution, deriveKey, hmacSignatureSecret: CLE, hmacKeySignatureSecret: `${CLE}:cle` });
  if (!resultat.verified) { console.warn('[contact] ALTCHA refusé', { expire: resultat.expired, signature: resultat.invalidSignature, solution: resultat.invalidSolution }); return false; }
  dejaUtilises.set(challenge.signature, true);
  return true;
}

export const server = {
  // Un défi neuf, ou null si la protection n’est pas configurée.
  defi: defineAction({
    handler: async () => {
      if (!CLE) return null;
      return createChallenge({
        ...REGLAGES,
        counter: randomInt(2500, 1500),
        expiresAt: Math.floor(Date.now() / 1000) + DUREE_DEFI,
        hmacSignatureSecret: CLE,
        hmacKeySignatureSecret: `${CLE}:cle`,
      });
    },
  }),

  contact: defineAction({
    accept: 'form',
    input: z.object({
      nom: z.string().trim().min(1, 'Indique ton nom.').max(100, 'Ton nom est un peu long (100 caractères au plus).').transform((n) => n.replace(/\s+/g, ' ')),
      email: z.string().trim().min(1, 'Indique ton adresse email.').max(200, 'Cette adresse email ne semble pas valide.').regex(EMAIL, 'Cette adresse email ne semble pas valide.'),
      message: z.string().trim()
        .min(10, 'Ton message doit faire au moins 10 caractères.')
        .max(5000, 'Ton message doit faire 5 000 caractères au plus.')
        .refine((m) => (m.match(LIEN) || []).length <= 3, 'Ton message contient trop de liens (3 au plus).'),
      // Pot de miel : invisible pour un humain.
      site: z.string().optional(),
      // La solution ALTCHA : { challenge, solution } en JSON.
      altcha: z.string().max(4000).optional(),
    }),
    handler: async (entree) => {
      // Un robot a rempli le pot de miel : on fait comme si tout allait bien.
      if (entree.site) return { envoye: true };
      if (!(await humain(entree.altcha))) {
        throw new ActionError({ code: 'FORBIDDEN', message: 'La vérification anti-robot n’a pas abouti. Réessaie dans un instant.' });
      }

      if (!RESEND_API_KEY) {
        console.error('[contact] RESEND_API_KEY manquante');
        throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: `L’envoi n’est pas encore configuré : ${INJOIGNABLE}` });
      }
      const { nom, email, message } = entree;
      const reponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: EXPEDITEUR,
          to: DESTINATAIRE,
          reply_to: `${nom} <${email}>`,
          subject: `Message de ${nom} via florian-etourneau.dev`,
          text: `${message}\n\n— ${nom} <${email}>`,
        }),
      }).catch(() => null);
      if (!reponse?.ok) {
        console.error('[contact] échec Resend', reponse?.status, await reponse?.text().catch(() => ''));
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: `L’envoi a échoué. Réessaie, ou ${INJOIGNABLE}` });
      }
      return { envoye: true };
    },
  }),
};
