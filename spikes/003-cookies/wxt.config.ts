import { defineConfig } from 'wxt';
export default defineConfig({ manifest: {
  name: 'WebSentinelKit Cookies Spike', description: 'Local synthetic cookie experiment.',
  action: { default_title: 'Open cookies spike' }, permissions: ['activeTab', 'sidePanel'],
  optional_permissions: ['cookies'], optional_host_permissions: ['https://127.0.0.1/*'],
} });
