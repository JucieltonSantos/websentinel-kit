export type Counters = {
  received: number; accepted: number; rejected: number;
  reasons: { not_observing: number; different_tab: number; not_main_frame: number };
};
type EventIdentity = { tabId: number; frameId: number; type: string };
export function createCounters(): Counters {
  return { received: 0, accepted: 0, rejected: 0, reasons: { not_observing: 0, different_tab: 0, not_main_frame: 0 } };
}
export function recordEvent(counters: Counters, targetTab: number | undefined, event: EventIdentity): boolean {
  counters.received++;
  const reason = targetTab === undefined ? 'not_observing' : event.tabId !== targetTab ? 'different_tab' : event.frameId !== 0 || event.type !== 'main_frame' ? 'not_main_frame' : undefined;
  if (reason) { counters.rejected++; counters.reasons[reason]++; return false; }
  counters.accepted++;
  return true;
}
export function addPermissionEvent(events: string[], event: 'host_added' | 'host_removed'): void {
  if (events.length === 100) events.shift();
  events.push(event);
}
