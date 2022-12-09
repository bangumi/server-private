import { expect, test } from '@jest/globals';

import { HCaptcha } from './hcaptcha/_impl';

const client = new HCaptcha();

test('should success', async () => {
  await expect(client.verify('10000000-aaaa-bbbb-cccc-000000000001')).resolves.toBe(true);
});
