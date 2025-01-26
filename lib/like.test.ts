import { expect, test } from 'vitest';

import { fetchTopicReactions } from '@app/lib/like.ts';

test('group topic reactions', async () => {
  await expect(fetchTopicReactions(379821)).resolves.toMatchSnapshot();
});
