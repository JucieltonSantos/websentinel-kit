import { z } from 'zod';
import { coverageSchema, evidenceSchema, idSchema, ruleEvaluationSchema, ruleIdSchema, scanContextSchema } from './scan';
const boundedText = z.string().min(1).max(500).regex(/^[a-zA-Z0-9 .,;:()_-]+$/);
export const findingSchema = z.strictObject({ findingId: idSchema, ruleId: ruleIdSchema, scanId: idSchema, evidenceIds: z.array(idSchema).min(1).max(1000), severity: z.enum(['LOW', 'MEDIUM']), evidenceConfidence: z.enum(['HIGH', 'MEDIUM']), riskConfidence: z.enum(['LOW', 'MEDIUM']), technicalJustification: boundedText, remediationId: ruleIdSchema }).superRefine((value, ctx) => {
  if (value.severity !== (value.ruleId === 'SEC-010' ? 'LOW' : 'MEDIUM')) ctx.addIssue({ code: 'custom', message: 'Invalid severity' });
  const low = ['SEC-005','SEC-006','SEC-007','SEC-008'].includes(value.ruleId);
  if (value.riskConfidence !== (low ? 'LOW' : 'MEDIUM')) ctx.addIssue({ code: 'custom', message: 'Invalid risk confidence' });
});
export const correlationResultSchema = z.strictObject({ correlationId: z.enum(['COR-001', 'COR-002']), scanId: idSchema, documentId: idSchema, findingIds: z.array(idSchema).min(2).max(1000), evidenceIds: z.array(idSchema).min(2).max(1000), explanation: boundedText });
export const scanResultSchema = z.strictObject({ context: scanContextSchema, status: z.enum(['COMPLETED', 'INTERRUPTED']), incomplete: z.boolean(), evaluations: z.array(ruleEvaluationSchema).length(10), findings: z.array(findingSchema).max(1000), correlations: z.array(correlationResultSchema).max(2), coverage: z.array(coverageSchema).max(1000), limitations: z.array(boundedText).max(1000) }).superRefine((value, ctx) => {
  if (value.context.phase !== value.status || (value.status === 'INTERRUPTED' && !value.incomplete)) ctx.addIssue({ code: 'custom', message: 'Invalid terminal state' });
  if (new Set(value.evaluations.map(e => e.ruleId)).size !== 10 || value.evaluations.some(e => e.scanId !== value.context.scanId)) ctx.addIssue({ code: 'custom', message: 'Invalid evaluations' });
  if (new Set(value.findings.map(f => f.findingId)).size !== value.findings.length || new Set(value.correlations.map(c => c.correlationId)).size !== value.correlations.length) ctx.addIssue({ code: 'custom', message: 'Duplicate IDs' });
  for (const f of value.findings) {
    const e = value.evaluations.find(item => item.ruleId === f.ruleId);
    if (new Set(f.evidenceIds).size !== f.evidenceIds.length || f.scanId !== value.context.scanId || !e || e.status !== 'FAILED' || !e.findingIds.includes(f.findingId) || f.evidenceIds.some(id => !e.evidenceIds.includes(id))) ctx.addIssue({ code: 'custom', message: 'Finding mismatch' });
  }
  for (const e of value.evaluations) if (new Set(e.findingIds).size !== e.findingIds.length || new Set(e.evidenceIds).size !== e.evidenceIds.length || e.findingIds.some(id => !value.findings.some(f => f.findingId === id && f.ruleId === e.ruleId))) ctx.addIssue({ code: 'custom', message: 'Unknown or duplicated reference' });
  for (const c of value.correlations) {
    const related = value.findings.filter(f => c.findingIds.includes(f.findingId));
    if (new Set(c.findingIds).size !== c.findingIds.length || new Set(c.evidenceIds).size !== c.evidenceIds.length || c.scanId !== value.context.scanId || c.documentId !== value.context.documentId || c.findingIds.some(id => !value.findings.some(f => f.findingId === id)) || c.evidenceIds.some(id => !related.some(f => f.evidenceIds.includes(id)))) ctx.addIssue({ code: 'custom', message: 'Correlation context mismatch' });
  }
});
export type Finding = z.infer<typeof findingSchema>;
export type CorrelationResult = z.infer<typeof correlationResultSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;
export function validateScanResult(input: unknown, evidence: unknown): boolean {
  const result = scanResultSchema.safeParse(input); const items = z.array(evidenceSchema).max(1000).safeParse(evidence);
  if (!result.success || !items.success) return false;
  const { data } = result;
  if (!data.context.documentId && (data.status !== 'INTERRUPTED' || items.data.length !== 0 || data.findings.length !== 0 || data.correlations.length !== 0 || data.evaluations.some(e => e.status !== 'NOT_EVALUATED' || e.evidenceIds.length !== 0))) return false;
  if (new Set(items.data.map(e => e.evidenceId)).size !== items.data.length || items.data.some(e => e.scanId !== data.context.scanId || e.documentId !== data.context.documentId)) return false;
  const known = new Set(items.data.map(e => e.evidenceId));
  return [...data.evaluations, ...data.findings, ...data.correlations].every(item => item.evidenceIds.every(id => known.has(id)));
}
