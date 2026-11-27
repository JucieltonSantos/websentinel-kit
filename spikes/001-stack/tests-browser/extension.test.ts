import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('loads the extension worker and renders its panel document', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'websentinel-stack-spike-'));
  const extension = resolve('.output/chrome-mv3');
  try {
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      expect(worker.url()).toMatch(/^chrome-extension:\/\/[a-p]{32}\/background\.js$/);
      const extensionId = new URL(worker.url()).hostname;
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(page.getByRole('heading', { name: 'Stack spike' })).toBeVisible();
      await expect(page.getByText('Side Panel prototype is running.')).toBeVisible();
    } finally {
      await context.close();
    }
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
});
