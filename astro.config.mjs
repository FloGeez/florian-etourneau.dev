// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import { cpSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

// Les favicons viennent de @etourneau/brand : recopiés dans public/favicon (ignoré par git) au lancement du dev et du build.
const favicons = {
  name: 'favicons',
  hooks: {
    'astro:config:setup': () => {
      const source = dirname(createRequire(import.meta.url).resolve('@etourneau/brand/favicon/favicon.svg'));
      cpSync(source, 'public/favicon', { recursive: true, filter: (f) => !f.endsWith('.html') });
    },
  },
};

// Le site reste statique ; seule la route /api/contact tourne côté serveur (fonction Vercel).
export default defineConfig({
  site: 'https://florian-etourneau.dev',
  adapter: vercel(),
  integrations: [favicons],
  // Le build écrit dans .vercel/ : le serveur de dev ne doit pas recharger la page pour autant.
  vite: { server: { watch: { ignored: ['**/.vercel/**'] } } },
  env: {
    schema: {
      // Clé API Resend, à déclarer dans Vercel (Settings → Environment Variables) et dans .env en local.
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Anti-robot du formulaire (ALTCHA) : une clé secrète qu’on invente, pour signer les défis.
      // Facultative : sans elle, la vérification est ignorée en production ; en local, une clé de développement sert.
      ALTCHA_HMAC_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
