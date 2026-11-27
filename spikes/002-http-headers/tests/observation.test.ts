import { describe, expect, it } from 'vitest';
import { summarize, belongsToScan } from '../observation';

describe('header observation boundary', () => {
  it('retains only allowlisted presence, never values or unknown headers', () => {
    const result = summarize([{ name: 'Content-Security-Policy', value: 'secret-canary-csp' }, { name: 'Set-Cookie', value: 'secret-canary-cookie' }, { name: 'Authorization', value: 'secret-canary-auth' }, { name: 'X-Frame-Options', value: 'secret-canary-xfo' }]);
    expect(result).toEqual({ csp: true, hsts: false, xfo: true });
    expect(JSON.stringify(result)).not.toContain('secret-canary');
  });
  it('distinguishes an observed response with no target headers', () => {
    expect(summarize([])).toEqual({ csp: false, hsts: false, xfo: false });
  });
  it('filters other tabs, subframes and secondary resources', () => {
    expect(belongsToScan({ tabId: 4, frameId: 0, type: 'main_frame' }, 4)).toBe(true);
    expect(belongsToScan({ tabId: 5, frameId: 0, type: 'main_frame' }, 4)).toBe(false);
    expect(belongsToScan({ tabId: 4, frameId: 1, type: 'sub_frame' }, 4)).toBe(false);
    expect(belongsToScan({ tabId: 4, frameId: 0, type: 'script' }, 4)).toBe(false);
  });
});
