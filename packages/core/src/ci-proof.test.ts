import { expect, it } from 'vitest';

// Intentionally failing test to prove CI turns red (C-002). Reverted in the next commit.
it('fails on purpose', () => {
  expect(1 + 1).toBe(3);
});
