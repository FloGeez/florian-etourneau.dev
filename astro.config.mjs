// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// Le site reste statique ; seule la route /api/contact tourne côté serveur (fonction Vercel).
export default defineConfig({
  site: 'https://florian-etourneau.dev',
  adapter: vercel(),
  env: {
    schema: {
      // Clé API Resend, à déclarer dans Vercel (Settings → Environment Variables) et dans .env en local.
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
