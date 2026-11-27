import { describe, expect, it } from 'vitest';
import { validateScanResult } from '../../src/contracts/results';
const scanId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const evidenceId = '33333333-3333-4333-8333-333333333333';
const findingId = '44444444-4444-4444-8444-444444444444';
const coverage = { source: 'storage', status: 'COMPLETE', reason: 'Observed', limits: [] };
const evidence = [{ evidenceId, scanId, documentId, kind: 'storage', facts: { area: 'localStorage', jwtLike: true }, source: 'storage', observedAt: '2026-11-26T12:00:00.000Z', limitations: [] }];
const finding = { findingId, ruleId: 'SEC-005', scanId, evidenceIds: [evidenceId], severity: 'MEDIUM', evidenceConfidence: 'HIGH', riskConfidence: 'LOW', technicalJustification: 'Potential risk', remediationId: 'SEC-005' };
const evaluations = Array.from({ length: 10 }, (_, i) => ({ ruleId: `SEC-${String(i+1).padStart(3, '0')}`, scanId, status: i === 4 ? 'FAILED' : 'PASSED', evidenceIds: i === 4 ? [evidenceId] : [], coverage, reason: 'Observed', findingIds: i === 4 ? [findingId] : [] }));
const result = { context: { scanId, tabId: 1, frameId: 0, documentId, navigationId: scanId, origin: 'https://example.com', startedAt: '2026-11-26T12:00:00.000Z', phase: 'COMPLETED' }, status: 'COMPLETED', incomplete: false, evaluations, findings: [finding], correlations: [], coverage: [coverage], limitations: [] };
describe('result contracts', () => {
  it('accepts ten consistent evaluations and scoped references', () => expect(validateScanResult(result, evidence)).toBe(true));
  it('rejects duplicated or missing rules', () => expect(validateScanResult({ ...result, evaluations: [...evaluations.slice(0, 9), evaluations[0]] }, evidence)).toBe(false));
  it('rejects evidence from another document', () => expect(validateScanResult(result, [{ ...evidence[0], documentId: scanId }])).toBe(false));
  it('rejects evidence from another scan', () => expect(validateScanResult(result, [{ ...evidence[0], scanId: documentId }])).toBe(false));
  it('rejects unresolvable finding references', () => expect(validateScanResult({ ...result, findings: [{ ...finding, evidenceIds: [scanId] }] }, evidence)).toBe(false));
  it('rejects severity inconsistent with the rule', () => expect(validateScanResult({ ...result, findings: [{ ...finding, severity: 'LOW' }] }, evidence)).toBe(false));
  it('rejects unexpected raw values', () => expect(validateScanResult({ ...result, token: 'secret' }, evidence)).toBe(false));
});

describe('correlation references', () => {
  it('rejects correlations whose evidence is not tied to their findings', () => {
    const second = { ...finding, findingId: scanId, ruleId: 'SEC-001', riskConfidence: 'MEDIUM' };
    const updated = evaluations.map((e, i) => i === 0 ? { ...e, status: 'FAILED', findingIds: [scanId], evidenceIds: [evidenceId] } : e);
    const unrelated = '55555555-5555-4555-8555-555555555555';
    const otherEvidence = { ...evidence[0], evidenceId: unrelated };
    const correlation = { correlationId: 'COR-001', scanId, documentId, findingIds: [findingId, scanId], evidenceIds: [evidenceId, unrelated], explanation: 'Combined risk' };
    expect(validateScanResult({ ...result, evaluations: updated, findings: [finding, second], correlations: [correlation] }, [...evidence, otherEvidence])).toBe(false);
  });
});

describe('interrupted scans', () => {
  it('accepts an interrupted scan before document confirmation with no evidence', () => {
    const interrupted = { ...result, context: { ...result.context, documentId: undefined, phase: 'INTERRUPTED' }, status: 'INTERRUPTED', incomplete: true, evaluations: evaluations.map(e => ({ ...e, status: 'NOT_EVALUATED', evidenceIds: [], findingIds: [], coverage: { ...coverage, status: 'UNAVAILABLE' } })), findings: [], correlations: [] };
    expect(validateScanResult(interrupted, [])).toBe(true);
  });
});

describe('result reference integrity', () => {
  it('rejects a failed finding that belongs to a different rule', () => {
    expect(validateScanResult({ ...result, findings: [{ ...finding, ruleId: 'SEC-006', riskConfidence: 'LOW' }] }, evidence)).toBe(false);
  });
  it('rejects duplicate evidence IDs in findings', () => {
    expect(validateScanResult({ ...result, findings: [{ ...finding, evidenceIds: [evidenceId, evidenceId] }] }, evidence)).toBe(false);
  });
  it('rejects a complete result without a confirmed document', () => {
    expect(validateScanResult({ ...result, context: { ...result.context, documentId: undefined } }, evidence)).toBe(false);
  });
});
