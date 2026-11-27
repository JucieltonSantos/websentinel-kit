const output = document.querySelector<HTMLPreElement>('#output')!;
function show(value: unknown) { output.textContent = JSON.stringify(value, null, 2); }
function button(id: string, fn: () => Promise<unknown>) { document.querySelector<HTMLButtonElement>(id)!.addEventListener('click', () => { void fn().then(show).catch(() => show({error:'operation_failed'})); }); }
button('#cookies', () => chrome.permissions.request({permissions:['cookies']}));
button('#host', () => chrome.permissions.request({origins:['https://127.0.0.1/*']}));
button('#revoke', () => chrome.permissions.remove({origins:['https://127.0.0.1/*']}));
button('#status', () => chrome.runtime.sendMessage('status'));
button('#ordinary', () => chrome.runtime.sendMessage('observe-unpartitioned'));
button('#partitioned', () => chrome.runtime.sendMessage('observe-partitioned'));
