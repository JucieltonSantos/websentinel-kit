import { defineConfig } from 'wxt';
export default defineConfig({
  manifest: {
    name: 'WebSentinelKit HTTP Headers Spike',
    description: 'Controlled local header observation experiment.',
    action: { default_title: 'Open HTTP headers spike' },
    permissions: ['activeTab', 'scripting', 'sidePanel', 'webRequest'],
    optional_host_permissions: ['http://127.0.0.1/*'],
  },
});
