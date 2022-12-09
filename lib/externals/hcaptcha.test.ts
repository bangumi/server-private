import { expect, test, vi } from 'vitest';

import type { HCaptcha } from './hcaptcha';

const hCaptcha = await vi.importActual<{ HCaptcha: typeof HCaptcha }>('./hcaptcha');

const client = new hCaptcha.HCaptcha();

test('should success', async () => {
  await expect(client.verify('10000000-aaaa-bbbb-cccc-000000000001')).resolves.toBe(true);
});
