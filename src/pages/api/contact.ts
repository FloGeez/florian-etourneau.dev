// Formulaire de contact : reçoit nom, email, message et les envoie par Resend.
// Répond en JSON quand le script du site appelle, redirige vers #contact sinon (formulaire sans JS).
import type { APIRoute } from 'astro';
import { RESEND_API_KEY } from 'astro:env/server';

export const prerender = false;

const DESTINATAIRE = 'florian.etourneau@gmail.com';
const EXPEDITEUR = 'florian-etourneau.dev <contact@florian-etourneau.dev>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, redirect }) => {
  const enJson = request.headers.get('accept')?.includes('application/json');
  const repondre = (ok: boolean, erreur?: string, statut = ok ? 200 : 400, champ?: string) =>
    enJson ? Response.json({ ok, erreur, champ }, { status: statut }) : redirect(ok ? '/?envoye#contact' : '/?erreur#contact', 303);

  let donnees: FormData;
  try { donnees = await request.formData(); } catch { return repondre(false, 'Formulaire illisible.'); }
  const champ = (nom: string) => String(donnees.get(nom) ?? '').trim();
  const nom = champ('nom').replace(/\s+/g, ' '), email = champ('email'), message = champ('message');

  // Pot de miel : un humain ne voit pas ce champ, un robot le remplit. On fait comme si tout allait bien.
  if (champ('site')) return repondre(true);

  if (!nom || nom.length > 100) return repondre(false, 'Indique ton nom.', 400, 'nom');
  if (!EMAIL.test(email) || email.length > 200) return repondre(false, 'Cette adresse email ne semble pas valide.', 400, 'email');
  if (message.length < 10 || message.length > 5000) return repondre(false, 'Ton message doit faire entre 10 et 5 000 caractères.', 400, 'message');

  if (!RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY manquante');
    return repondre(false, 'L’envoi n’est pas encore configuré. Écris-moi directement à l’adresse ci-dessus.', 503);
  }

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
    return repondre(false, 'L’envoi a échoué. Réessaie, ou écris-moi directement à l’adresse ci-dessus.', 502);
  }
  return repondre(true);
};
