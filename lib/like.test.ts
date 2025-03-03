import { expect, test } from 'vitest';

import { LikeType, Reaction } from '@app/lib/like.ts';

test('group topic reactions', async () => {
  await expect(Reaction.fetchByMainID(379821, LikeType.GroupReply)).resolves.toMatchSnapshot();
});
