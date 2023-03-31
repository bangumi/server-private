import { expect, test } from 'vitest';

import { fetchGroupTopic } from '@app/lib/like';

test('group topic reactions', async () => {
  await expect(fetchGroupTopic(379821, 406430)).resolves.toMatchSnapshot();
});
