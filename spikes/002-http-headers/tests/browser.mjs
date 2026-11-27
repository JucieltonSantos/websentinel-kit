import { chromium } from '@playwright/test';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const root = await mkdtemp(join(tmpdir(), 'websentinel-headers-test-'));
const fixture = spawn(process.execPath, ['fixture.mjs'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WSK_FIXTURE_PORT: '4187' } });
let fixtureError = '';
fixture.stderr.on('data', data => { fixtureError += data; });
try {
  await new Promise((ok, fail) => {
    fixture.stdout.once('data', ok);
    fixture.once('exit', () => fail(new Error(`Fixture exited: ${fixtureError}`)));
    setTimeout(() => fail(new Error('Fixture startup timed out')), 5000).unref();
  });
  for (const hostGranted of [false, true]) for (let attempt = 1; attempt <= 3; attempt++) {
    const extension = join(root, `extension-${hostGranted}-${attempt}`);
    await cp(resolve('.output/chrome-mv3'), extension, { recursive: true });
    if (hostGranted) {
      // Test-only comparison: exact local host is mandatory in this disposable copy.
      const file = join(extension, 'manifest.json');
      const manifest = JSON.parse(await readFile(file, 'utf8'));
      manifest.host_permissions = ['http://127.0.0.1/*'];
      delete manifest.optional_host_permissions;
      await writeFile(file, JSON.stringify(manifest));
    }
    const context = await chromium.launchPersistentContext(join(root, `profile-${hostGranted}-${attempt}`), {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
    });
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const id = new URL(worker.url()).host;
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4187/with-headers');
      await page.bringToFront();
      const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id);
      assert.equal(typeof tabId, 'number');
      const panel = await context.newPage();
      await panel.goto(`chrome-extension://${id}/sidepanel.html`);
      await panel.evaluate(async (tabId) => { await chrome.runtime.sendMessage({ type: 'LAB_SELECT', tabId }); await chrome.runtime.sendMessage('reset_diagnostics'); await chrome.runtime.sendMessage('start'); }, tabId);
      const getStatus = () => panel.evaluate(() => chrome.runtime.sendMessage('status'));
      assert.equal((await getStatus()).observation, null);
      await page.goto('http://127.0.0.1:4187/with-headers');
      await page.waitForTimeout(400);
      const observed = (await getStatus()).observation;
      if (!hostGranted) {
        assert.equal(observed, null);
        console.log(`Control without icon gesture or host grant, attempt ${attempt}: no response observed.`);
      } else {
        assert.equal(typeof observed?.documentIdAvailable, 'boolean');
        assert.deepEqual({ ...observed, documentIdAvailable: undefined }, { csp: true, hsts: true, xfo: true, headersAvailable: true, tabIdAvailable: true, requestIdAvailable: true, documentIdAvailable: undefined });
        const presentStatus = await getStatus();
        assert.equal(presentStatus.mainListenerRegistered, true);
        assert.equal(presentStatus.mainCounters.accepted, 1);
        assert.doesNotMatch(JSON.stringify(presentStatus), /secret-canary/);
        await panel.click('#refresh');
        assert.doesNotMatch(await panel.locator('#diagnostics').innerText(), /secret-canary/);
        await panel.evaluate(async () => { await chrome.runtime.sendMessage('start'); await chrome.runtime.sendMessage('reset_diagnostics'); });
        const other = await context.newPage();
        await other.goto('http://127.0.0.1:4187/with-headers');
        await page.waitForTimeout(300);
        const otherStatus = await getStatus();
        assert.equal(otherStatus.observation, null);
        assert.ok(otherStatus.mainCounters.reasons.different_tab >= 1);
        await page.goto('http://127.0.0.1:4187/no-headers');
        await page.waitForTimeout(400);
        const absent = (await getStatus()).observation;
        assert.equal(typeof absent?.documentIdAvailable, 'boolean');
        assert.deepEqual({ ...absent, documentIdAvailable: undefined }, { csp: false, hsts: false, xfo: false, headersAvailable: true, tabIdAvailable: true, requestIdAvailable: true, documentIdAvailable: undefined });
        const noHeadersStatus = await getStatus();
        assert.equal(noHeadersStatus.mainCounters.accepted, 1);
        assert.equal(noHeadersStatus.mainCounters.received, 2);
        await panel.click('#add');
        assert.equal((await getStatus()).additionalListenerRegistered, true);
        await page.goto('http://127.0.0.1:4187/with-headers');
        await page.waitForTimeout(300);
        assert.equal((await getStatus()).additionalCounters.accepted, 1);
        await panel.click('#remove');
        assert.equal((await getStatus()).additionalListenerRegistered, false);
        await page.goto('http://127.0.0.1:4187/no-headers');
        await page.waitForTimeout(300);
        assert.equal((await getStatus()).additionalCounters.accepted, 1);
        const oldInstance = (await getStatus()).instanceId;
        const cdp = await context.newCDPSession(panel);
        const targets = await cdp.send('Target.getTargets');
        const workerTarget = targets.targetInfos.find(target => target.type === 'service_worker' && target.url === `chrome-extension://${id}/background.js`);
        assert.ok(workerTarget);
        const closed = await cdp.send('Target.closeTarget', { targetId: workerTarget.targetId });
        assert.equal(closed.success, true);
        await new Promise(resolve => setTimeout(resolve, 200));
        const restarted = await getStatus();
        assert.notEqual(restarted.instanceId, oldInstance);
        assert.equal(restarted.observing, false);
        assert.equal(restarted.tabSelected, false);
        assert.equal(restarted.observation, null);
        assert.equal(restarted.mainListenerRegistered, true);
        assert.equal(restarted.additionalListenerRegistered, false);
        assert.equal(restarted.mainCounters.received, 0);
        console.log(`Exact host in disposable test manifest, attempt ${attempt}: E7/E8, diagnostic listener, canaries and forced E9 worker state loss passed.`);
        console.log(`onHeadersReceived metadata observed: tabId=yes requestId=yes documentId=${observed.documentIdAvailable ? 'yes' : 'no'}.`);
      }
    } finally { await context.close(); }
  }
} finally {
  fixture.kill();
  await rm(root, { recursive: true, force: true });
}
