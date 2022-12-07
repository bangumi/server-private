import { expect, test } from '@jest/globals';

import { fetchPermission, fetchUser } from './orm';

test('should fetch user', async () => {
  await expect(fetchUser(382951)).resolves.toMatchSnapshot();
});

test('should fetch permission', async () => {
  expect(Object.keys(await fetchPermission(0))).toHaveLength(0);
});

test('should fallback to empty permission', async () => {
  await expect(fetchPermission(10)).resolves.toMatchSnapshot();
});
