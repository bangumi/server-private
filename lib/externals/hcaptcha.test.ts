import { expect, test, vi } from 'vitest';

import type * as hCaptchaModule from './hcaptcha';

const hCaptcha = await vi.importActual<typeof hCaptchaModule>('./hcaptcha');

const client = new hCaptcha.HCaptcha('0x0000000000000000000000000000000000000000');

test('should success', async () => {
  await expect(client.verify('10000000-aaaa-bbbb-cccc-000000000001')).resolves.toBe(true);
});
