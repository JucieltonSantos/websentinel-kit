import { describe, expect, it } from 'vitest';
import { canTransition, validateCoverage, validateEvidence, validateRuleEvaluation, validateScanContext } from '../../src/contracts/scan';

const scanId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const evidenceId = '33333333-3333-4333-8333-333333333333';
const findingId = '44444444-4444-4444-8444-444444444444';
const coverage = { source: 'storage', status: 'COMPLETE', reason: 'Observed', limits: [] };
const context = { scanId, tabId: 1, frameId: 0, documentId, navigationId: scanId, origin: 'https://example.com', startedAt: '2026-11-26T12:00:00.000Z', phase: 'COLLECTING' };
const evidence = { evidenceId, scanId, documentId, kind: 'storage', facts: { area: 'localStorage', jwtLike: true }, source: 'storage', observedAt: '2026-11-26T12:00:00.000Z', limitations: [] };

describe('scan contracts', () => {
  it('accepts a scoped context', () => expect(validateScanContext(context)).toBe(true));
  it('rejects invalid identity and non-main frame', () => {
    expect(validateScanContext({ ...context, scanId: 'wrong' })).toBe(false);
    expect(validateScanContext({ ...context, frameId: 1 })).toBe(false);
  });
  it('rejects origins carrying sensitive data', () => expect(validateScanContext({ ...context, origin: 'https://user:secret@example.com/path?token=secret' })).toBe(false));
  it('accepts sanitized evidence', () => expect(validateEvidence(evidence)).toBe(true));
  it('rejects raw tokens and unexpected fields', () => expect(validateEvidence({ ...evidence, facts: { ...evidence.facts, token: 'secret' } })).toBe(false));
  it('accepts partial coverage without treating it as complete', () => expect(validateCoverage({ ...coverage, status: 'PARTIAL', reason: 'Limit reached' })).toBe(true));
  it('rejects unknown coverage', () => expect(validateCoverage({ ...coverage, status: 'UNKNOWN' })).toBe(false));
  it('accepts allowed state transitions and interruption', () => {
    expect(canTransition('IDLE', 'WAITING_PERMISSION')).toBe(true);
    expect(canTransition('COLLECTING', 'INTERRUPTED')).toBe(true);
  });
  it('rejects skipping transitions and restarting terminal scans', () => {
    expect(canTransition('IDLE', 'COMPLETED')).toBe(false);
    expect(canTransition('COMPLETED', 'COLLECTING')).toBe(false);
  });
  it.each(['PASSED', 'NOT_APPLICABLE', 'NOT_EVALUATED'])('accepts %s without findings', status => {
    expect(validateRuleEvaluation({ ruleId: 'SEC-001', scanId, status, evidenceIds: [], coverage, reason: 'Observed', findingIds: [] })).toBe(true);
  });
  it('requires evidence and findings for FAILED', () => {
    const evaluation = { ruleId: 'SEC-001', scanId, status: 'FAILED', evidenceIds: [evidenceId], coverage, reason: 'Observed', findingIds: [findingId] };
    expect(validateRuleEvaluation(evaluation)).toBe(true);
    expect(validateRuleEvaluation({ ...evaluation, evidenceIds: [] })).toBe(false);
  });
  it('rejects PASSED with partial coverage', () => expect(validateRuleEvaluation({ ruleId: 'SEC-001', scanId, status: 'PASSED', evidenceIds: [], coverage: { ...coverage, status: 'PARTIAL' }, reason: 'Limited', findingIds: [] })).toBe(false));
});

describe('normalized policy evidence', () => {
  it('accepts a bounded CSP summary without transmitting a raw header', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'csp', present: true, scriptPolicy: 'BLOCKS_UNSAFE_EVAL', frameAncestors: 'RESTRICTED' } })).toBe(true);
  });
  it('rejects a raw CSP header', () => {
    expect(validateEvidence({ ...evidence, kind: 'header', source: 'header', facts: { header: 'csp', present: true, raw: "script-src 'nonce-secret'" } })).toBe(false);
  });
});

describe('partial coverage and status', () => {
  it('accepts NOT_APPLICABLE with partial coverage and no finding', () => {
    expect(validateRuleEvaluation({ ruleId: 'SEC-003', scanId, status: 'NOT_APPLICABLE', evidenceIds: [], coverage: { ...coverage, status: 'PARTIAL' }, reason: 'Not applicable', findingIds: [] })).toBe(true);
  });
  it('accepts FAILED with partial coverage and positive evidence', () => {
    expect(validateRuleEvaluation({ ruleId: 'SEC-005', scanId, status: 'FAILED', evidenceIds: [evidenceId], coverage: { ...coverage, status: 'PARTIAL' }, reason: 'Observed', findingIds: [findingId] })).toBe(true);
  });
  it('rejects findings attached to a non-failed evaluation', () => {
    expect(validateRuleEvaluation({ ruleId: 'SEC-005', scanId, status: 'NOT_EVALUATED', evidenceIds: [], coverage: { ...coverage, status: 'UNAVAILABLE' }, reason: 'Unavailable', findingIds: [findingId] })).toBe(false);
  });
});
