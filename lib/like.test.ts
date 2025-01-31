import { expect, test } from 'vitest';

import { fetchTopicReactions, LikeType } from '@app/lib/like.ts';

test('group topic reactions', async () => {
  await expect(fetchTopicReactions(379821, LikeType.GroupReply)).resolves.toMatchSnapshot();
});
