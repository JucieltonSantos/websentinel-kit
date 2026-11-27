import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WebSentinelKit',
    description: 'Local-first security analysis for web applications.',
    action: { default_title: 'Open WebSentinelKit' },
    permissions: ['sidePanel'],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
