import { describe, expect, it } from 'vitest';
import { createCounters, recordEvent, addPermissionEvent } from '../diagnostics';

describe('sanitized diagnostics', () => {
  it('classifies received, accepted and rejected events without retaining payload', () => {
    const counters = createCounters();
    recordEvent(counters, undefined, { tabId: 1, frameId: 0, type: 'main_frame' });
    recordEvent(counters, 1, { tabId: 2, frameId: 0, type: 'main_frame' });
    recordEvent(counters, 1, { tabId: 1, frameId: 1, type: 'sub_frame' });
    const event = { tabId: 1, frameId: 0, type: 'main_frame', secret: 'secret-canary' };
    recordEvent(counters, 1, event);
    expect(counters).toEqual({ received: 4, accepted: 1, rejected: 3, reasons: { not_observing: 1, different_tab: 1, not_main_frame: 1 } });
    expect(JSON.stringify(counters)).not.toContain('secret-canary');
  });
  it('limits and classifies permission changes without recording origins', () => {
    const events: string[] = [];
    for (let i = 0; i < 105; i++) addPermissionEvent(events, i % 2 ? 'host_removed' : 'host_added');
    expect(events).toHaveLength(100);
    expect(events.at(-1)).toBe('host_added');
  });
});
