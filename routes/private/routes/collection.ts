import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { NotFoundError } from '@app/lib/error.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import { fetchUserByUsername } from '@app/lib/orm/index.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

const SlimSubject = t.Object({
  airtime: t.Ref(res.SubjectAirtime),
  eps: t.Integer(),
  id: t.Integer(),
  images: t.Ref(res.SubjectImages),
  infobox: t.Array(t.Ref(res.Infobox)),
  locked: t.Boolean(),
  name: t.String(),
  name_cn: t.String(),
  nsfw: t.Boolean(),
  platform: t.Ref(res.SubjectPlatform),
  rating: t.Ref(res.SubjectRating),
  redirect: t.Integer(),
  series: t.Boolean(),
  series_entry: t.Integer(),
  summary: t.String(),
  type: t.Integer(),
  volumes: t.Integer(),
});

const UserCollectionsSubjectCounts = t.Object({
  wish: t.Integer(),
  collect: t.Integer(),
  doing: t.Integer(),
  onHold: t.Integer(),
  dropped: t.Integer(),
});

const UserCollectionsSubjectSummary = t.Object({
  counts: t.Ref(UserCollectionsSubjectCounts),
  doing: t.Array(t.Ref(SlimSubject)),
  collect: t.Array(t.Ref(SlimSubject)),
});

const UserCollectionsSummary = t.Object({
  subject: t.Ref(UserCollectionsSubjectSummary),
  // character: t.Ref(UserCollectionsCharacterSummary),
  // person: t.Ref(UserCollectionsPersonSummary),
  // index: t.Ref(UserCollectionsIndexSummary),
});

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(UserCollectionsSummary);

  app.get(
    '/users/:username/collections/summary',
    {
      schema: {
        description: '获取用户收藏概览',
        operationId: 'getUserCollectionsSummary',
        tags: [Tag.Collection],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        response: {
          200: t.Ref(UserCollectionsSummary),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ params: { username } }): Promise<Static<typeof UserCollectionsSummary>> => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }
      return {
        subject: {
          collect: [],
          doing: [],
          counts: {
            wish: 0,
            collect: 0,
            doing: 0,
            onHold: 0,
            dropped: 0,
          },
        },
      };
    },
  );
}
