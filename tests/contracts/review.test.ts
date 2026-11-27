import { describe, expect, it } from 'vitest';
import { validateMessage } from '../../src/contracts/messages';
import { validateEvidence } from '../../src/contracts/scan';
import { validateScanResult } from '../../src/contracts/results';

const extensionId = 'a'.repeat(32);
const scanId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const evidenceId = '33333333-3333-4333-8333-333333333333';
const findingId = '44444444-4444-4444-8444-444444444444';
const coverage = { source: 'storage', status: 'COMPLETE', reason: 'Observed', limits: [] };
const evidence = { evidenceId, scanId, documentId, kind: 'storage', facts: { area: 'localStorage', jwtLike: true }, source: 'storage', observedAt: '2026-11-26T12:00:00.000Z', limitations: [] };
const finding = { findingId, ruleId: 'SEC-005', scanId, evidenceIds: [evidenceId], severity: 'MEDIUM', evidenceConfidence: 'HIGH', riskConfidence: 'LOW', technicalJustification: 'Potential risk', remediationId: 'SEC-005' };
const evaluations = Array.from({ length: 10 }, (_, i) => ({ ruleId: `SEC-${String(i + 1).padStart(3, '0')}`, scanId, status: i === 4 ? 'FAILED' : 'PASSED', evidenceIds: i === 4 ? [evidenceId] : [], coverage, reason: 'Observed', findingIds: i === 4 ? [findingId] : [] }));
const context = { scanId, tabId: 1, frameId: 0, documentId, navigationId: scanId, origin: 'https://example.com', startedAt: '2026-11-26T12:00:00.000Z', phase: 'COMPLETED' };
const result = { context, status: 'COMPLETED', incomplete: false, evaluations, findings: [finding], correlations: [], coverage: [coverage], limitations: [] };
const input = { version: 1, type: 'REQUEST_EXPLANATION', requestId: scanId, scanId, documentId, payload: { finding, evidence: [evidence], chunks: [] } };
const active = { tabId: 1, documentId, scanId, evidence: [evidence], result };
const sender = { id: extensionId, url: `chrome-extension://${extensionId}/sidepanel.html` };

describe('contract corrective review', () => {
  it('rejects an invented finding with otherwise consistent identifiers', () => {
    const forged = { ...finding, technicalJustification: 'Invented risk' };
    expect(validateMessage({ ...input, payload: { ...input.payload, finding: forged } }, sender, extensionId, active)).toBe(false);
  });
  it('rejects changed evidence with otherwise consistent identifiers', () => {
    const forged = { ...evidence, facts: { ...evidence.facts, jwtLike: false } };
    expect(validateMessage({ ...input, payload: { ...input.payload, evidence: [forged] } }, sender, extensionId, active)).toBe(false);
  });
  it('rejects duplicate evidence in EVIDENCE messages', () => {
    const msg = { version: 1, type: 'EVIDENCE', requestId: scanId, scanId, documentId, payload: { evidence: [evidence, evidence], coverage: [] } };
    expect(validateMessage(msg, { id: extensionId, url: 'https://example.com/', tab: { id: 1 }, frameId: 0, documentId }, extensionId, active)).toBe(false);
  });
  it('rejects contradictory HSTS facts', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'hsts', present: false, hstsEffective: true } })).toBe(false);
  });
  it('rejects CSP facts attached to an HSTS header', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'hsts', present: true, scriptPolicy: 'ALLOWS_UNSAFE_EVAL' } })).toBe(false);
  });
  it('accepts a completed lifecycle with partial coverage and incomplete true', () => {
    const partial = { ...result, incomplete: true, coverage: [{ ...coverage, status: 'PARTIAL' }] };
    expect(validateScanResult(partial, [evidence])).toBe(true);
  });
});

describe('native sender boundary', () => {
  it('does not trust a claimed surface without native sender metadata', () => {
    const start = { version: 1, type: 'START_SCAN', requestId: scanId, scanId, payload: { tabId: 1 } };
    expect(validateMessage(start, { id: extensionId, surface: 'sidepanel' }, extensionId)).toBe(false);
  });
});

describe('trusted explanation and sender metadata', () => {
  it('accepts an unchanged finding and its evidence from the validated result', () => {
    expect(validateMessage(input, sender, extensionId, active)).toBe(true);
  });
  it('rejects a request without the trusted result', () => {
    expect(validateMessage(input, sender, extensionId, { tabId: 1, documentId, scanId, evidence: [evidence] })).toBe(false);
  });
  it('rejects duplicate evidence references in a request', () => {
    expect(validateMessage({ ...input, payload: { ...input.payload, evidence: [evidence, evidence] } }, sender, extensionId, active)).toBe(false);
  });
  it('accepts native side panel metadata and rejects a different extension page', () => {
    const start = { version: 1, type: 'START_SCAN', requestId: scanId, scanId, payload: { tabId: 1 } };
    expect(validateMessage(start, sender, extensionId)).toBe(true);
    expect(validateMessage(start, { id: extensionId, url: `chrome-extension://${extensionId}/other.html` }, extensionId)).toBe(false);
  });
  it('accepts native background metadata for status but not a claimed surface', () => {
    const status = { version: 1, type: 'SCAN_STATUS', requestId: scanId, scanId, payload: { phase: 'COLLECTING' } };
    expect(validateMessage(status, { id: extensionId, url: `chrome-extension://${extensionId}/background.js` }, extensionId, active)).toBe(true);
    expect(validateMessage(status, { id: extensionId, surface: 'background' }, extensionId, active)).toBe(false);
  });
});

describe('header evidence consistency', () => {
  it('rejects effective restrictions on an absent CSP', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'csp', present: false, scriptPolicy: 'BLOCKS_UNSAFE_EVAL' } })).toBe(false);
  });
  it('rejects an XFO restriction when that header is absent', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'xfo', present: false, xfoRestricts: true } })).toBe(false);
  });
  it('rejects CSP policy on an XFO header', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'xfo', present: true, scriptPolicy: 'BLOCKS_UNSAFE_EVAL' } })).toBe(false);
  });
  it('rejects a meta policy declared absent with a script restriction', () => {
    expect(validateEvidence({ ...evidence, kind: 'meta', source: 'meta', facts: { cspPresent: false, scriptPolicy: 'BLOCKS_UNSAFE_EVAL' } })).toBe(false);
  });
});

describe('result and evidence isolation', () => {
  it('accepts a valid result from the background with trusted evidence', () => {
    const message = { version: 1, type: 'SCAN_RESULT', requestId: scanId, scanId, documentId, payload: result };
    expect(validateMessage(message, { id: extensionId, url: `chrome-extension://${extensionId}/background.js` }, extensionId, active)).toBe(true);
  });
  it('rejects an evidence message from a subframe', () => {
    const msg = { version: 1, type: 'EVIDENCE', requestId: scanId, scanId, documentId, payload: { evidence: [evidence], coverage: [] } };
    const subframe = { id: extensionId, url: 'https://example.com/', tab: { id: 1 }, frameId: 2, documentId };
    expect(validateMessage(msg, subframe, extensionId, active)).toBe(false);
  });
  it('allows incomplete coverage with an otherwise completed lifecycle', () => {
    const limited = { ...result, incomplete: true, evaluations: evaluations.map((entry, index) => index === 0 ? { ...entry, status: 'NOT_EVALUATED', coverage: { ...coverage, status: 'UNAVAILABLE' } } : entry), coverage: [{ ...coverage, status: 'UNAVAILABLE' }] };
    expect(validateScanResult(limited, [evidence])).toBe(true);
  });
});
