import { describe, expect, it } from 'vitest';
import { validateMessage } from '../../src/contracts/messages';
const extensionId = 'a'.repeat(32);
const scanId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const sender = { id: extensionId, url: `chrome-extension://${extensionId}/sidepanel.html` };
const message = { version: 1, type: 'START_SCAN', requestId: scanId, scanId, payload: { tabId: 1 } };
describe('message contracts', () => {
  it('accepts a valid panel request', () => expect(validateMessage(message, sender, extensionId)).toBe(true));
  it('rejects unknown fields and versions', () => {
    expect(validateMessage({ ...message, token: 'secret' }, sender, extensionId)).toBe(false);
    expect(validateMessage({ ...message, version: 2 }, sender, extensionId)).toBe(false);
  });
  it('rejects malformed identifiers', () => expect(validateMessage({ ...message, scanId: 'x' }, sender, extensionId)).toBe(false));
  it('rejects external and incorrect surfaces', () => {
    expect(validateMessage(message, { ...sender, id: 'b'.repeat(32) }, extensionId)).toBe(false);
    expect(validateMessage(message, { ...sender, url: 'https://example.com/' }, extensionId)).toBe(false);
  });
  it('rejects payloads larger than 1 MiB', () => expect(validateMessage({ ...message, payload: { tabId: 1, extra: 'a'.repeat(1048577) } }, sender, extensionId)).toBe(false));
  it('rejects mismatched content document or tab', () => {
    const e = { version: 1, type: 'EVIDENCE', requestId: scanId, scanId, documentId, payload: { evidence: [], coverage: [] } };
    expect(validateMessage(e, { id: extensionId, url: 'https://example.com/', tab: { id: 1 }, frameId: 0, documentId: scanId }, extensionId)).toBe(false);
  });
});

describe('content sender context', () => {
  it('accepts a content sender only for the active tab and document', () => {
    const input = { version: 1, type: 'EVIDENCE', requestId: scanId, scanId, documentId, payload: { evidence: [], coverage: [] } };
    const origin = { id: extensionId, url: 'https://example.com/', tab: { id: 1 }, frameId: 0, documentId };
    expect(validateMessage(input, origin, extensionId, { tabId: 1, documentId, scanId })).toBe(true);
    expect(validateMessage(input, origin, extensionId, { tabId: 2, documentId, scanId })).toBe(false);
    expect(validateMessage(input, origin, extensionId, { tabId: 1, documentId, scanId: documentId })).toBe(false);
    expect(validateMessage(input, origin, extensionId)).toBe(false);
  });
});

describe('message size limit', () => {
  it('rejects an oversized otherwise well-formed evidence message', () => {
    const evidence = { evidenceId: '33333333-3333-4333-8333-333333333333', scanId, documentId, kind: 'storage', facts: { area: 'localStorage', jwtLike: true }, source: 'storage', observedAt: '2026-11-26T12:00:00.000Z', limitations: Array(1000).fill('A'.repeat(160)) };
    const input = { version: 1, type: 'EVIDENCE', requestId: scanId, scanId, documentId, payload: { evidence: Array(7).fill(evidence), coverage: [] } };
    const origin = { id: extensionId, url: 'https://example.com/', tab: { id: 1 }, frameId: 0, documentId };
    expect(new TextEncoder().encode(JSON.stringify(input)).byteLength).toBeGreaterThan(1048576);
    expect(validateMessage(input, origin, extensionId, { tabId: 1, documentId, scanId })).toBe(false);
  });
});

describe('message origin and shape', () => {
  it('rejects an evidence payload carrying raw cookie values', () => {
    const raw = { evidenceId: '33333333-3333-4333-8333-333333333333', scanId, documentId, kind: 'cookie', source: 'cookie', observedAt: '2026-11-26T12:00:00.000Z', limitations: [], facts: { candidate: true, httpOnly: false, secure: false, value: 'sensitive-cookie' } };
    const input = { version: 1, type: 'EVIDENCE', requestId: scanId, scanId, documentId, payload: { evidence: [raw], coverage: [] } };
    expect(validateMessage(input, { id: extensionId, url: 'https://example.com/', tab: { id: 1 }, frameId: 0, documentId }, extensionId, { tabId: 1, documentId, scanId })).toBe(false);
  });
  it('rejects a result message without trusted evidence for referenced findings', () => {
    const coverage = { source: 'storage', status: 'COMPLETE', reason: 'Observed', limits: [] };
    const evaluations = Array.from({ length: 10 }, (_, i) => ({ ruleId: `SEC-${String(i + 1).padStart(3, '0')}`, scanId, status: 'PASSED', evidenceIds: ['33333333-3333-4333-8333-333333333333'], coverage, reason: 'Observed', findingIds: [] }));
    const context = { scanId, tabId: 1, frameId: 0, documentId, navigationId: scanId, origin: 'https://example.com', startedAt: '2026-11-26T12:00:00.000Z', phase: 'COMPLETED' };
    const result = { context, status: 'COMPLETED', incomplete: false, evaluations, findings: [], correlations: [], coverage: [coverage], limitations: [] };
    const input = { version: 1, type: 'SCAN_RESULT', requestId: scanId, scanId, documentId, payload: result };
    expect(validateMessage(input, { id: extensionId, url: `chrome-extension://${extensionId}/background.js` }, extensionId, { tabId: 1, scanId, documentId })).toBe(false);
  });
});

describe('explanation request references', () => {
  it('requires all finding evidence to be present in the same active context', () => {
    const evidenceId = '33333333-3333-4333-8333-333333333333';
    const finding = { findingId: '44444444-4444-4444-8444-444444444444', ruleId: 'SEC-005', scanId, evidenceIds: [evidenceId], severity: 'MEDIUM', evidenceConfidence: 'HIGH', riskConfidence: 'LOW', technicalJustification: 'Potential risk', remediationId: 'SEC-005' };
    const evidence = { evidenceId, scanId, documentId, kind: 'storage', facts: { area: 'localStorage', jwtLike: true }, source: 'storage', observedAt: '2026-11-26T12:00:00.000Z', limitations: [] };
    const input = { version: 1, type: 'REQUEST_EXPLANATION', requestId: scanId, scanId, documentId, payload: { finding, evidence: [evidence], chunks: [] } };
    const coverage = { source: 'storage', status: 'COMPLETE', reason: 'Observed', limits: [] };
    const evaluations = Array.from({ length: 10 }, (_, i) => ({ ruleId: `SEC-${String(i + 1).padStart(3, '0')}`, scanId, status: i === 4 ? 'FAILED' : 'PASSED', evidenceIds: i === 4 ? [evidenceId] : [], coverage, reason: 'Observed', findingIds: i === 4 ? [finding.findingId] : [] }));
    const context = { scanId, tabId: 1, frameId: 0, documentId, navigationId: scanId, origin: 'https://example.com', startedAt: '2026-11-26T12:00:00.000Z', phase: 'COMPLETED' };
    const result = { context, status: 'COMPLETED', incomplete: false, evaluations, findings: [finding], correlations: [], coverage: [coverage], limitations: [] };
    const active = { tabId: 1, documentId, scanId, result, evidence: [evidence] };
    expect(validateMessage(input, sender, extensionId, active)).toBe(true);
    expect(validateMessage({ ...input, payload: { ...input.payload, evidence: [] } }, sender, extensionId, active)).toBe(false);
  });
});
