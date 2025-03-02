import { expect, test } from 'vitest';

import { fetchReactionsByMainID, LikeType } from '@app/lib/like.ts';

test('group topic reactions', async () => {
  await expect(fetchReactionsByMainID(379821, LikeType.GroupReply)).resolves.toMatchSnapshot();
});
