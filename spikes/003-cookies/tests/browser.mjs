import {chromium} from '@playwright/test';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const root = await mkdtemp(join(tmpdir(),'wsk-cookies-test-'));
try {
  for (const host of [false,true,'both','domains','no-cookies']) {
    const extension = join(root, `extension-${host}`);
    await cp(resolve('.output/chrome-mv3'),extension,{recursive:true});
    const manifestPath = join(extension,'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath,'utf8'));
    if (host !== 'no-cookies') { manifest.permissions.push('cookies'); delete manifest.optional_permissions; }
    if (host) { manifest.host_permissions = host === 'both' ? ['https://127.0.0.1/*','http://127.0.0.1/*'] : host === 'domains' ? ['https://127.0.0.1/*','https://localhost/*'] : ['https://127.0.0.1/*']; delete manifest.optional_host_permissions; }
    await writeFile(manifestPath,JSON.stringify(manifest));
    // Instrument only this disposable copy. This is not a native icon gesture.
    const backgroundPath = join(extension,'background.js');
    const background = await readFile(backgroundPath,'utf8');
    const marker = 'if(e===`status`)'; assert.equal(background.split(marker).length,2);
    await writeFile(backgroundPath,background.replace(marker,'if(e?.type===`LAB_SELECT`){o=e.tabId;s({selected:true});return}'+marker));
    const context = await chromium.launchPersistentContext(join(root,`profile-${host}`),{channel:'chromium',headless:true,ignoreHTTPSErrors:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--no-sandbox']});
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const id = new URL(worker.url()).host;
      const target = await context.newPage();
      await target.goto('https://127.0.0.1:4193/setup');
      await target.goto('https://127.0.0.1:4193/target/page'); await target.bringToFront();
      const tabId = await worker.evaluate(async () => (await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0].id);
      if (host === 'domains') await context.addCookies([{url:'https://localhost:4193/target/page',name:'session',value:'CANARY_COOKIE_VALUE_DOMAIN',secure:true,httpOnly:true}]);
      const panel = await context.newPage(); const consoleLines = [];
      panel.on('console', msg => consoleLines.push(msg.text())); worker.on('console', msg => consoleLines.push(msg.text()));
      await panel.goto(`chrome-extension://${id}/sidepanel.html`);
      const unavailable = await panel.evaluate(() => chrome.runtime.sendMessage('observe-unpartitioned'));
      assert.equal(unavailable.status,'UNAVAILABLE'); assert.equal(unavailable.coverage,'UNAVAILABLE');
      await panel.evaluate(tabId => chrome.runtime.sendMessage({type:'LAB_SELECT',tabId}),tabId);
      const status = await panel.evaluate(() => chrome.runtime.sendMessage('status'));
      assert.equal(status.cookies,host !== 'no-cookies'); assert.equal(status.host,Boolean(host));
      if (host === 'no-cookies') {
        const missing = await panel.evaluate(() => chrome.runtime.sendMessage('observe-unpartitioned'));
        assert.deepEqual(missing,{status:'UNAVAILABLE',coverage:'UNAVAILABLE',facts:[],reason:'Access or query unavailable'});
        await panel.click('#cookies');
        assert.equal(await panel.evaluate(() => chrome.permissions.contains({permissions:['cookies']})),true);
        assert.equal(await panel.evaluate(() => chrome.permissions.remove({permissions:['cookies']})),true);
        assert.equal(await panel.evaluate(() => chrome.permissions.contains({permissions:['cookies']})),false);
        const revoked = await panel.evaluate(() => chrome.runtime.sendMessage('observe-unpartitioned'));
        assert.deepEqual(revoked,{status:'UNAVAILABLE',coverage:'UNAVAILABLE',facts:[],reason:'Access or query unavailable'});
        console.log('cookies permission absent and removed with selected tab and local host: UNAVAILABLE (removal is not denial)');
        continue;
      }
      const ordinary = await panel.evaluate(() => chrome.runtime.sendMessage('observe-unpartitioned'));
      const partitioned = await panel.evaluate(() => chrome.runtime.sendMessage('observe-partitioned'));
      assert.equal(ordinary.status,'OBSERVED'); assert.equal(ordinary.coverage,'PARTIAL');
      if (host) {
        assert.equal(ordinary.facts.length,host === 'both' ? 3 : 2);
        if (host === 'both') assert.ok(ordinary.facts.some(x => x.candidate && !x.secure && !x.httpOnly));
        assert.deepEqual(ordinary.facts.find(x => x.candidate),{candidate:true,httpOnly:true,secure:true});
        assert.equal(ordinary.facts.filter(x => !x.candidate && x.secure).length,1);
        assert.equal(partitioned.status,'OBSERVED'); assert.deepEqual(partitioned.facts,[{candidate:true,httpOnly:false,secure:true}]);
        const scope = await worker.evaluate(async tabId => {
          const store = (await chrome.cookies.getAllCookieStores()).find(s => s.tabIds.includes(tabId));
          if (!store) return null;
          const project = c => ({candidate:['session','sessionid','jsessionid','phpsessid','asp.net_sessionid','sid','sess','connect.sid'].includes(c.name.toLowerCase()),httpOnly:c.httpOnly,secure:c.secure});
          const otherPath = (await chrome.cookies.getAll({url:'https://127.0.0.1:4193/other/page',storeId:store.id})).map(project);
          const otherPartition = (await chrome.cookies.getAll({url:'https://127.0.0.1:4193/target/page',storeId:store.id,partitionKey:{topLevelSite:'https://localhost'}})).map(project);
          const otherDomain = (await chrome.cookies.getAll({url:'https://localhost:4193/target/page',storeId:store.id})).map(project);
          return {otherPath,otherPartition,otherDomain};
        },tabId);
        assert.deepEqual(scope.otherPath,[{candidate:true,httpOnly:false,secure:true}]);
        assert.deepEqual(scope.otherPartition,[]);
        if (host === 'domains') assert.deepEqual(scope.otherDomain,[{candidate:true,httpOnly:true,secure:true}]);
        else assert.deepEqual(scope.otherDomain,[]);
        console.log(`Different path and selected partition distinguished; non-Secure cookie ${host === 'both' ? 'visible' : 'not visible'}.`);
      } else { assert.equal(ordinary.facts.length,0); assert.equal(partitioned.facts.length,0); }
      await panel.click('#ordinary'); const visible = await panel.locator('#output').innerText();
      const storage = await panel.evaluate(() => ({local:Object.entries(localStorage),session:Object.entries(sessionStorage)}));
      assert.doesNotMatch(JSON.stringify({ordinary,partitioned,status,visible,storage,consoleLines}),/CANARY_COOKIE_VALUE/);
      console.log(`host=${host}: ordinary=${ordinary.facts.length}, selected partition=${partitioned.facts.length}; status, partial coverage and canary checks passed`);
    } finally { await context.close(); }
  }
} finally { await rm(root,{recursive:true,force:true}); }
