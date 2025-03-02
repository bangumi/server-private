import { expect, test } from 'vitest';

import { fetchReactions, LikeType } from '@app/lib/like.ts';

test('group topic reactions', async () => {
  await expect(fetchReactions(379821, LikeType.GroupReply)).resolves.toMatchSnapshot();
});
