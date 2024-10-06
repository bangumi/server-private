import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import { chiiSubjectInterests } from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { logger } from '@app/lib/logger';
import { Tag } from '@app/lib/openapi/index.ts';
import { fetchUserByUsername } from '@app/lib/orm/index.ts';
import { CollectionType } from '@app/lib/subject/collection';
import { SubjectType } from '@app/lib/subject/type.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

const SlimSubject = t.Object(
  {
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
  },
  {
    $id: 'SlimSubject',
  },
);

const UserCollectionsSubjectCounts = t.Object(
  {
    wish: t.Integer(),
    collect: t.Integer(),
    doing: t.Integer(),
    onHold: t.Integer(),
    dropped: t.Integer(),
  },
  { $id: 'UserCollectionsSubjectCounts' },
);

const UserCollectionsSubjectSummary = t.Object(
  {
    counts: t.Ref(UserCollectionsSubjectCounts),
    doing: t.Array(t.Ref(SlimSubject)),
    collect: t.Array(t.Ref(SlimSubject)),
  },
  { $id: 'UserCollectionsSubjectSummary' },
);

const UserCollectionSubjectTypes = t.Object(
  {
    book: t.Ref(UserCollectionsSubjectSummary),
    anime: t.Ref(UserCollectionsSubjectSummary),
    music: t.Ref(UserCollectionsSubjectSummary),
    game: t.Ref(UserCollectionsSubjectSummary),
    real: t.Ref(UserCollectionsSubjectSummary),
  },
  { $id: 'UserCollectionSubjectTypes' },
);

const UserCollectionsSummary = t.Object(
  {
    subject: t.Ref(UserCollectionSubjectTypes),
    // character: t.Ref(UserCollectionsCharacterSummary),
    // person: t.Ref(UserCollectionsPersonSummary),
    // index: t.Ref(UserCollectionsIndexSummary),
  },
  { $id: 'UserCollectionsSummary' },
);

function setCollectionCounts(
  summary: Static<typeof UserCollectionsSubjectSummary>,
  collectionType: number,
  counts: number,
) {
  switch (collectionType) {
    case CollectionType.Wish: {
      summary.counts.wish = counts;
      break;
    }
    case CollectionType.Collect: {
      summary.counts.collect = counts;
      break;
    }
    case CollectionType.Doing: {
      summary.counts.doing = counts;
      break;
    }
    case CollectionType.OnHold: {
      summary.counts.onHold = counts;
      break;
    }
    case CollectionType.Dropped: {
      summary.counts.dropped = counts;
      break;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.Infobox);
  app.addSchema(SlimSubject);
  app.addSchema(UserCollectionsSubjectCounts);
  app.addSchema(UserCollectionsSubjectSummary);
  app.addSchema(UserCollectionSubjectTypes);
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
      const defaultCounts = {
        wish: 0,
        collect: 0,
        doing: 0,
        onHold: 0,
        dropped: 0,
      };
      const subjectSummary = {
        book: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        anime: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        music: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        game: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        real: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
      };
      const data = await db
        .select({
          count: op.count(),
          interest_subject_type: chiiSubjectInterests.interestSubjectType,
          interest_type: chiiSubjectInterests.interestType,
        })
        .from(chiiSubjectInterests)
        .where(op.eq(chiiSubjectInterests.interestUid, user.id))
        .groupBy(chiiSubjectInterests.interestSubjectType, chiiSubjectInterests.interestType)
        .execute();
      logger.debug(data);
      for (const d of data) {
        switch (d.interest_subject_type) {
          case SubjectType.Book: {
            setCollectionCounts(subjectSummary.book, d.interest_type, d.count);
            break;
          }
          case SubjectType.Anime: {
            setCollectionCounts(subjectSummary.anime, d.interest_type, d.count);
            break;
          }
          case SubjectType.Music: {
            setCollectionCounts(subjectSummary.music, d.interest_type, d.count);
            break;
          }
          case SubjectType.Game: {
            setCollectionCounts(subjectSummary.game, d.interest_type, d.count);
            break;
          }
          case SubjectType.Real: {
            setCollectionCounts(subjectSummary.real, d.interest_type, d.count);
            break;
          }
        }
      }
      return {
        subject: subjectSummary,
      };
    },
  );
}
