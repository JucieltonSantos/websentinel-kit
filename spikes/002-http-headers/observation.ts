export function summarize(headers: Array<{ name: string; value?: string }>) {
  const result = { csp: false, hsts: false, xfo: false };
  for (const header of headers) {
    switch (header.name.toLowerCase()) {
      case 'content-security-policy': result.csp = true; break;
      case 'strict-transport-security': result.hsts = true; break;
      case 'x-frame-options': result.xfo = true; break;
    }
  }
  return result;
}
export function belongsToScan(event: { tabId: number; frameId: number; type: string }, tabId: number) {
  return event.tabId === tabId && event.frameId === 0 && event.type === 'main_frame';
}
