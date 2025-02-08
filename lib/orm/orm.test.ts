import { expect, test } from 'vitest';

import { fetchUser } from './index.ts';

test('should fetch user', async () => {
  await expect(fetchUser(382951)).resolves.toMatchSnapshot();
});
