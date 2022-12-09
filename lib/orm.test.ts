import { expect, test } from 'vitest';

import { fetchPermission, fetchUser } from './orm';

test('should fetch user', async () => {
  await expect(fetchUser(382951)).resolves.toMatchSnapshot();
});

test('should fetch permission', async () => {
  await expect(fetchPermission(0)).resolves.toEqual({});
});

test('should fallback to empty permission', async () => {
  await expect(fetchPermission(10)).resolves.toMatchSnapshot();
});
