import { z } from 'zod';
import { coverageSchema, evidenceSchema, idSchema } from './scan';
import { findingSchema, scanResultSchema, validateScanResult } from './results';
const base = { version: z.literal(1), requestId: idSchema, scanId: idSchema, documentId: idSchema.optional() };
const boundedText = z.string().min(1).max(500).regex(/^[a-zA-Z0-9 .,;:()_-]+$/);
const referenceSchema = z.strictObject({ sourceId: z.enum(['csp', 'session', 'xss', 'html5', 'third-party-js']), revision: boundedText, chunkId: idSchema });
const recommendationSchema = z.strictObject({ findingId: idSchema, mode: z.enum(['DETERMINISTIC', 'LOCAL_AI']), text: boundedText, references: z.array(referenceSchema).max(1000), limitations: z.array(boundedText).max(1000) });
const messageSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal('START_SCAN'), payload: z.strictObject({ tabId: z.number().int().nonnegative() }) }),
  z.strictObject({ ...base, type: z.literal('COLLECT'), documentId: idSchema, payload: z.strictObject({ categories: z.array(z.enum(['header','meta','storage','cookie','resource'])).max(5) }) }),
  z.strictObject({ ...base, type: z.literal('EVIDENCE'), documentId: idSchema, payload: z.strictObject({ evidence: z.array(evidenceSchema).max(1000), coverage: z.array(coverageSchema).max(5) }) }),
  z.strictObject({ ...base, type: z.literal('SCAN_STATUS'), payload: z.strictObject({ phase: z.enum(['WAITING_PERMISSION','WAITING_RESPONSE_OR_RELOAD','COLLECTING','EVALUATING','COMPLETED','INTERRUPTED']), reason: boundedText.optional(), coverage: z.array(coverageSchema).max(5).optional(), reloadRequired: z.boolean().optional() }) }),
  z.strictObject({ ...base, type: z.literal('SCAN_RESULT'), payload: scanResultSchema }),
  z.strictObject({ ...base, type: z.literal('REQUEST_EXPLANATION'), documentId: idSchema, payload: z.strictObject({ finding: findingSchema, evidence: z.array(evidenceSchema).max(1000), chunks: z.array(referenceSchema).max(1000) }) }),
  z.strictObject({ ...base, type: z.literal('EXPLANATION'), payload: recommendationSchema }),
]);
const senderSchema = z.object({ id: z.string(), url: z.string(), tab: z.object({ id: z.number().int().nonnegative() }).optional(), frameId: z.number().int().optional(), documentId: idSchema.optional() });
type NormalizedSender = { id: string; surface: 'sidepanel' | 'background' } | { id: string; surface: 'content'; tabId: number; frameId: 0; documentId: string };

// The caller must supply Chrome's native MessageSender, never message payload data.
function normalizeSender(sender: unknown, extensionId: string): NormalizedSender | undefined {
  const parsed = senderSchema.safeParse(sender);
  if (!parsed.success || parsed.data.id !== extensionId) return undefined;
  const value = parsed.data;
  if (value.url === `chrome-extension://${extensionId}/sidepanel.html`) return { id: value.id, surface: 'sidepanel' };
  if (value.url === `chrome-extension://${extensionId}/background.js`) return { id: value.id, surface: 'background' };
  let page: URL;
  try { page = new URL(value.url); } catch { return undefined; }
  if ((page.protocol !== 'https:' && page.protocol !== 'http:') || !value.tab || value.frameId !== 0 || !value.documentId) return undefined;
  return { id: value.id, surface: 'content', tabId: value.tab.id, frameId: 0, documentId: value.documentId };
}
export type Message = z.infer<typeof messageSchema>;
// `sender` comes from chrome.runtime.MessageSender; `active` is trusted extension-owned state.
export function validateMessage(input: unknown, sender: unknown, extensionId: string, active?: { tabId: number; documentId?: string; scanId: string; evidence?: unknown; result?: unknown }): boolean {
  try {
    const serialized = JSON.stringify(input);
    if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > 1024 * 1024) return false;
    const msg = messageSchema.safeParse(input); const from = normalizeSender(sender, extensionId);
    if (!msg.success || !from) return false;
    if (msg.data.type === 'START_SCAN') return from.surface === 'sidepanel';
    if (msg.data.type === 'EVIDENCE') return from.surface === 'content' && active !== undefined && from.tabId === active.tabId && from.documentId === active.documentId && msg.data.documentId === active.documentId && msg.data.scanId === active.scanId && new Set(msg.data.payload.evidence.map(e => e.evidenceId)).size === msg.data.payload.evidence.length && msg.data.payload.evidence.every(e => e.scanId === msg.data.scanId && e.documentId === msg.data.documentId);
    if (!active || active.scanId !== msg.data.scanId || (msg.data.documentId !== undefined && msg.data.documentId !== active.documentId)) return false;
    if (msg.data.type === 'REQUEST_EXPLANATION') {
      const { finding, evidence } = msg.data.payload;
      const evidenceIds = new Set(evidence.map(item => item.evidenceId));
      const trustedResult = scanResultSchema.safeParse(active.result);
      const trustedEvidence = z.array(evidenceSchema).max(1000).safeParse(active.evidence);
      if (from.surface !== 'sidepanel' || msg.data.documentId !== active.documentId || !trustedResult.success || !trustedEvidence.success || !validateScanResult(trustedResult.data, trustedEvidence.data) || trustedResult.data.context.tabId !== active.tabId || trustedResult.data.context.scanId !== active.scanId || trustedResult.data.context.documentId !== active.documentId || evidenceIds.size !== evidence.length || evidence.length !== finding.evidenceIds.length) return false;
      const savedFinding = trustedResult.data.findings.find(item => item.findingId === finding.findingId);
      return savedFinding !== undefined && JSON.stringify(savedFinding) === JSON.stringify(finding) && finding.evidenceIds.every(id => evidenceIds.has(id)) && evidence.every(item => {
        const saved = trustedEvidence.data.find(entry => entry.evidenceId === item.evidenceId);
        return saved !== undefined && JSON.stringify(saved) === JSON.stringify(item);
      });
    }
    if (msg.data.type === 'SCAN_RESULT') return from.surface === 'background' && msg.data.payload.context.scanId === active.scanId && msg.data.payload.context.tabId === active.tabId && msg.data.payload.context.documentId === active.documentId && validateScanResult(msg.data.payload, active.evidence);
    return from.surface === 'background';
  } catch { return false; }
}
