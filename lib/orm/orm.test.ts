import { expect, test } from 'vitest';

import { fetchPermission, fetchUser } from './index';

test('should fetch user', async () => {
  await expect(fetchUser(382951)).resolves.toMatchSnapshot();
});

test('should fetch permission', async () => {
  await expect(fetchPermission(0)).resolves.toMatchInlineSnapshot(`
    Object {
      "ban_post": true,
      "ban_visit": true,
    }
  `);
});

test('should fallback to empty permission', async () => {
  await expect(fetchPermission(10)).resolves.toMatchSnapshot();
});
