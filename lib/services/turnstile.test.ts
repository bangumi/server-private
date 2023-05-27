import { expect, test, vi } from 'vitest';

import type * as turnstileModule from './turnstile.ts';

const turnstile = await vi.importActual<typeof turnstileModule>('./turnstile');

test('should pass verify', async () => {
  const client = new turnstile.Turnstile('1x0000000000000000000000000000000AA');
  await expect(client.verify('res')).resolves.toBe(true);
});

test('should fail verify', async () => {
  const client = new turnstile.Turnstile('2x0000000000000000000000000000000AA');
  await expect(client.verify('res')).resolves.toBe(false);
});
