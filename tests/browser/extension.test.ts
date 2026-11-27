import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('loads the extension worker and renders the panel document', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'websentinel-root-'));
  try {
    const extension = resolve('.output/chrome-mv3');
    const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const page = await context.newPage();
      await page.goto(`chrome-extension://${new URL(worker.url()).hostname}/sidepanel.html`);
      await expect(page.getByRole('heading', { name: 'WebSentinelKit' })).toBeVisible();
    } finally { await context.close(); }
  } finally { await rm(profile, { recursive: true, force: true }); }
});
