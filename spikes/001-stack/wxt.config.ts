import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WebSentinelKit Stack Spike',
    description: 'Isolated stack compatibility experiment.',
    action: { default_title: 'Open stack spike' },
    permissions: ['sidePanel'],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
