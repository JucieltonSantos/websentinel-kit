import { summarize } from '../observation';
import { addPermissionEvent, createCounters, recordEvent } from '../diagnostics';

type Observation = { csp: boolean; hsts: boolean; xfo: boolean; headersAvailable: boolean; tabIdAvailable: boolean; requestIdAvailable: boolean; documentIdAvailable: boolean };
const localHost = 'http://127.0.0.1/*';
const instanceId = crypto.randomUUID();
const initializedAt = new Date().toISOString();
let selectedTab: number | undefined;
let targetTab: number | undefined;
let observation: Observation | null = null;
let probe: 'not_tested' | 'succeeded' | 'failed' = 'not_tested';
let mainCounters = createCounters();
let additionalCounters = createCounters();
const permissionEvents: string[] = [];
let mainRegistration = 'pending';

const mainListener = (details: chrome.webRequest.OnHeadersReceivedDetails) => {
  if (!recordEvent(mainCounters, targetTab, details)) return undefined;
  observation = {
    ...summarize(details.responseHeaders ?? []),
    headersAvailable: Array.isArray(details.responseHeaders),
    tabIdAvailable: Number.isInteger(details.tabId),
    requestIdAvailable: typeof details.requestId === 'string' && details.requestId.length > 0,
    documentIdAvailable: typeof details.documentId === 'string' && details.documentId.length > 0,
  };
  return undefined;
};
const additionalListener = (details: chrome.webRequest.OnHeadersReceivedDetails) => {
  recordEvent(additionalCounters, targetTab, details);
  return undefined;
};
const filter = { urls: [localHost], types: ['main_frame' as const] };

export default defineBackground(() => {
  // WXT invokes this callback synchronously at startup; no permission query precedes registration.
  try {
    chrome.webRequest.onHeadersReceived.addListener(mainListener, filter, ['responseHeaders']);
    mainRegistration = chrome.webRequest.onHeadersReceived.hasListener(mainListener) ? 'registered' : 'not_registered';
  } catch { mainRegistration = 'registration_failed'; }
  chrome.permissions.onAdded.addListener((permissions) => {
    if (permissions.origins?.includes(localHost)) addPermissionEvent(permissionEvents, 'host_added');
  });
  chrome.permissions.onRemoved.addListener((permissions) => {
    if (permissions.origins?.includes(localHost)) addPermissionEvent(permissionEvents, 'host_removed');
  });
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id === undefined || tab.windowId === undefined) return;
    selectedTab = tab.id;
    void chrome.sidePanel.open({ windowId: tab.windowId });
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'LAB_SELECT' && Number.isInteger(message.tabId)) { selectedTab = message.tabId; sendResponse({ selected: true }); }
    if (message === 'selected') sendResponse({ tabId: selectedTab });
    if (message === 'probe_succeeded' || message === 'probe_failed') { probe = message === 'probe_succeeded' ? 'succeeded' : 'failed'; sendResponse({ saved: true }); }
    if (message === 'start') { targetTab = selectedTab; observation = null; sendResponse({ started: targetTab !== undefined }); }
    if (message === 'stop') { targetTab = undefined; observation = null; sendResponse({ stopped: true }); }
    if (message === 'add_listener') { chrome.webRequest.onHeadersReceived.addListener(additionalListener, filter); sendResponse({ registered: chrome.webRequest.onHeadersReceived.hasListener(additionalListener) }); }
    if (message === 'remove_listener') { chrome.webRequest.onHeadersReceived.removeListener(additionalListener); sendResponse({ registered: chrome.webRequest.onHeadersReceived.hasListener(additionalListener) }); }
    if (message === 'reset_diagnostics') { mainCounters = createCounters(); additionalCounters = createCounters(); permissionEvents.length = 0; sendResponse({ reset: true }); }
    if (message === 'status') {
      chrome.permissions.contains({ origins: [localHost] }).then((hostGranted) => sendResponse({
        instanceId, initializedAt, hostGranted, probe,
        mainRegistration, mainListenerRegistered: chrome.webRequest.onHeadersReceived.hasListener(mainListener),
        additionalListenerRegistered: chrome.webRequest.onHeadersReceived.hasListener(additionalListener),
        observing: targetTab !== undefined, tabSelected: selectedTab !== undefined,
        mainCounters, additionalCounters, permissionEvents: [...permissionEvents], observation,
      })).catch(() => sendResponse({ error: 'permission_check_failed' }));
      return true;
    }
  });
});
