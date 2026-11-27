const status = document.querySelector<HTMLParagraphElement>('#status')!;
const diagnostics = document.querySelector<HTMLPreElement>('#diagnostics')!;
const show = (message: string) => { status.textContent = message; };
const send = (message: unknown) => chrome.runtime.sendMessage(message);
const refresh = async () => { diagnostics.textContent = JSON.stringify(await send('status'), null, 2); };
const button = (id: string, handler: () => void) => document.querySelector<HTMLButtonElement>(id)!.addEventListener('click', handler);
button('#probe', () => { void (async () => {
  const selected = await send('selected') as { tabId?: number };
  if (selected.tabId === undefined) return show('No tab selected by extension icon.');
  try {
    await chrome.scripting.executeScript({ target: { tabId: selected.tabId }, func: () => true });
    await send('probe_succeeded'); show('activeTab probe: script execution succeeded on the selected tab.');
  } catch { await send('probe_failed'); show('activeTab probe: script execution unavailable or denied.'); }
  await refresh();
})(); });
button('#permission', () => { void (async () => {
  try { const granted = await chrome.permissions.request({ origins: ['http://127.0.0.1/*'] }); show(`Optional local host permission: ${granted ? 'granted' : 'denied'}.`); }
  catch { show('Optional local host permission: unavailable or denied.'); }
  await refresh();
})(); });
button('#revoke', () => { void (async () => {
  try { const removed = await chrome.permissions.remove({ origins: ['http://127.0.0.1/*'] }); show(`Optional local host removal: ${removed ? 'completed' : 'not completed'}.`); }
  catch { show('Optional local host removal failed.'); }
  await refresh();
})(); });
button('#start', () => { void (async () => {
  const result = await send('start') as { started: boolean };
  show(result.started ? 'Observing: response not observed yet. Manually reload the fixture tab, then refresh diagnostics.' : 'No tab selected by extension icon.');
  await refresh();
})(); });
button('#stop', () => { void (async () => { await send('stop'); show('Stopped.'); await refresh(); })(); });
button('#add', () => { void (async () => { await send('add_listener'); show('Diagnostic listener registration requested.'); await refresh(); })(); });
button('#remove', () => { void (async () => { await send('remove_listener'); show('Diagnostic listener removal requested.'); await refresh(); })(); });
button('#reset', () => { void (async () => { await send('reset_diagnostics'); show('Counters and permission events reset.'); await refresh(); })(); });
button('#refresh', () => { void refresh().catch(() => show('Worker unavailable. Repeat the experiment.')); });
void refresh().catch(() => show('Worker unavailable. Repeat the experiment.'));
