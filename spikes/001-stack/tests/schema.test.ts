import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const status = z.object({ ready: z.boolean() }).strict();
describe('spike schema', () => {
  it('accepts a valid status', () => expect(status.parse({ ready: true }).ready).toBe(true));
  it('rejects invalid or unexpected data', () => {
    expect(status.safeParse({ ready: 'yes' }).success).toBe(false);
    expect(status.safeParse({ ready: true, extra: 1 }).success).toBe(false);
  });
});
