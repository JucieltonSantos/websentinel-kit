import { z } from 'zod';

export const idSchema = z.uuid();
export const sourceSchema = z.enum(['header', 'meta', 'storage', 'cookie', 'resource']);
export const phaseSchema = z.enum(['IDLE', 'WAITING_PERMISSION', 'WAITING_RESPONSE_OR_RELOAD', 'COLLECTING', 'EVALUATING', 'COMPLETED', 'INTERRUPTED']);
const boundedText = z.string().min(1).max(160).regex(/^[a-zA-Z0-9 .,;:()_-]+$/);
const originSchema = z.url().refine(value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && value === url.origin; } catch { return false; }
});
export const coverageSchema = z.strictObject({ source: sourceSchema, status: z.enum(['COMPLETE', 'PARTIAL', 'UNAVAILABLE']), reason: boundedText, limits: z.array(boundedText).max(1000) });
export const scanContextSchema = z.strictObject({ scanId: idSchema, tabId: z.number().int().nonnegative(), frameId: z.literal(0), documentId: idSchema.optional(), navigationId: idSchema, origin: originSchema.optional(), startedAt: z.iso.datetime(), phase: phaseSchema }).superRefine((value, ctx) => {
  if (['COLLECTING', 'EVALUATING', 'COMPLETED'].includes(value.phase) && !value.documentId) ctx.addIssue({ code: 'custom', message: 'Confirmed document required' });
});
const policy = z.enum(['ALLOWS_UNSAFE_EVAL', 'BLOCKS_UNSAFE_EVAL', 'UNRESTRICTED', 'UNKNOWN']);
const evidenceBase = { evidenceId: idSchema, scanId: idSchema, documentId: idSchema, observedAt: z.iso.datetime(), limitations: z.array(boundedText).max(1000) };
export const evidenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...evidenceBase, kind: z.literal('storage'), source: z.literal('storage'), facts: z.strictObject({ area: z.enum(['localStorage', 'sessionStorage']), jwtLike: z.boolean() }) }),
  z.strictObject({ ...evidenceBase, kind: z.literal('cookie'), source: z.literal('cookie'), facts: z.strictObject({ candidate: z.boolean(), httpOnly: z.boolean(), secure: z.boolean() }) }),
  z.strictObject({ ...evidenceBase, kind: z.literal('header'), source: z.literal('header'), facts: z.discriminatedUnion('header', [
    z.strictObject({ header: z.literal('csp'), present: z.boolean(), scriptPolicy: policy.optional(), frameAncestors: z.enum(['RESTRICTED', 'UNRESTRICTED', 'UNKNOWN']).optional() }).refine(value => value.present || (value.scriptPolicy === undefined && value.frameAncestors === undefined)),
    z.strictObject({ header: z.literal('hsts'), present: z.boolean(), hstsEffective: z.boolean().optional() }).refine(value => value.present || value.hstsEffective !== true),
    z.strictObject({ header: z.literal('xfo'), present: z.boolean(), xfoRestricts: z.boolean().optional() }).refine(value => value.present || value.xfoRestricts !== true),
  ]) }),
  z.strictObject({ ...evidenceBase, kind: z.literal('meta'), source: z.literal('meta'), facts: z.strictObject({ cspPresent: z.boolean(), scriptPolicy: policy.optional() }).refine(value => value.cspPresent || value.scriptPolicy === undefined) }),
  z.strictObject({ ...evidenceBase, kind: z.literal('resource'), source: z.literal('resource'), facts: z.strictObject({ scheme: z.enum(['http', 'https']), external: z.boolean(), hasIntegrity: z.boolean().optional(), state: z.enum(['REFERENCED', 'ATTEMPTED', 'LOADED', 'BLOCKED', 'UPGRADED', 'UNKNOWN']) }) }),
]);
export const ruleIdSchema = z.enum(['SEC-001','SEC-002','SEC-003','SEC-004','SEC-005','SEC-006','SEC-007','SEC-008','SEC-009','SEC-010']);
export const ruleEvaluationSchema = z.strictObject({ ruleId: ruleIdSchema, scanId: idSchema, status: z.enum(['PASSED', 'FAILED', 'NOT_APPLICABLE', 'NOT_EVALUATED']), evidenceIds: z.array(idSchema).max(1000), coverage: coverageSchema, reason: boundedText, findingIds: z.array(idSchema).max(1000) }).superRefine((value, ctx) => {
  if (value.status === 'FAILED' && (!value.evidenceIds.length || !value.findingIds.length)) ctx.addIssue({ code: 'custom', message: 'Failed requires evidence and findings' });
  if (value.status !== 'FAILED' && value.findingIds.length) ctx.addIssue({ code: 'custom', message: 'Only failed evaluations have findings' });
  if (value.status === 'PASSED' && value.coverage.status !== 'COMPLETE') ctx.addIssue({ code: 'custom', message: 'Passed requires complete coverage' });
});
export type ScanContext = z.infer<typeof scanContextSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Coverage = z.infer<typeof coverageSchema>;
export type RuleEvaluation = z.infer<typeof ruleEvaluationSchema>;
export const validateScanContext = (input: unknown): boolean => scanContextSchema.safeParse(input).success;
export const validateEvidence = (input: unknown): boolean => evidenceSchema.safeParse(input).success;
export const validateCoverage = (input: unknown): boolean => coverageSchema.safeParse(input).success;
export const validateRuleEvaluation = (input: unknown): boolean => ruleEvaluationSchema.safeParse(input).success;
const transitions: Record<z.infer<typeof phaseSchema>, readonly z.infer<typeof phaseSchema>[]> = { IDLE: ['WAITING_PERMISSION'], WAITING_PERMISSION: ['WAITING_RESPONSE_OR_RELOAD', 'INTERRUPTED'], WAITING_RESPONSE_OR_RELOAD: ['COLLECTING', 'INTERRUPTED'], COLLECTING: ['EVALUATING', 'INTERRUPTED'], EVALUATING: ['COMPLETED', 'INTERRUPTED'], COMPLETED: [], INTERRUPTED: [] };
export function canTransition(from: string, to: string): boolean { const a = phaseSchema.safeParse(from); const b = phaseSchema.safeParse(to); return a.success && b.success && transitions[a.data].includes(b.data); }
