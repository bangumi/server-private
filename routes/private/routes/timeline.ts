import { Type as t } from '@sinclair/typebox';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth';
import { CommentWithoutState } from '@app/lib/comment';
import { Dam } from '@app/lib/dam';
import { BadRequestError, NotFoundError } from '@app/lib/error';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getTimelineInbox } from '@app/lib/timeline/inbox';
import { fetchTimelineByID, fetchTimelineByIDs } from '@app/lib/timeline/item.ts';
import { TimelineSource } from '@app/lib/timeline/type';
import { TimelineWriter } from '@app/lib/timeline/writer';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const comment = new CommentWithoutState(schema.chiiTimelineComments);

  app.get(
    '/timeline',
    {
      schema: {
        summary: '获取时间线',
        operationId: 'getTimeline',
        tags: [Tag.Timeline],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          mode: t.Optional(
            req.Ref(req.FilterMode, {
              description: '登录时默认为 friends, 未登录或没有好友时始终为 all',
            }),
          ),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 20, description: 'min 1, max 20' }),
          ),
          until: t.Optional(t.Integer({ description: 'max timeline id to fetch from' })),
        }),
        response: {
          200: t.Array(res.Ref(res.Timeline)),
        },
      },
    },
    async ({ auth, query: { mode = req.IFilterMode.Friends, limit = 20, until } }) => {
      const ids = [];
      switch (mode) {
        case req.IFilterMode.Friends: {
          const ret = await getTimelineInbox(auth.userID, limit, until);
          ids.push(...ret);
          break;
        }
        case req.IFilterMode.All: {
          const ret = await getTimelineInbox(0, limit, until);
          ids.push(...ret);
          break;
        }
      }
      const result = await fetchTimelineByIDs(auth, ids);
      const items = [];
      for (const tid of ids) {
        const item = result[tid];
        if (item) {
          items.push(item);
        }
      }
      const uids = items.map((v) => v.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      for (const item of items) {
        item.user = users[item.uid];
      }
      return items;
    },
  );

  app.post(
    '/timeline',
    {
      schema: {
        summary: '发送时间线吐槽',
        operationId: 'createTimelineSay',
        tags: [Tag.Timeline],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Intersect([req.Ref(req.CreateContent), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({ id: t.Integer() }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('posting a say'), requireTurnstileToken()],
    },
    async ({ auth, body: { content } }) => {
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('text contains invalid invisible character');
      }
      if (auth.permission.ban_post) {
        throw new NotAllowedError('post timeline say');
      }
      const text = lo.escape(content).normalize('NFC');
      if (text.length > 380) {
        throw new BadRequestError('content too long');
      }

      await rateLimit(LimitAction.Timeline, auth.userID);
      const id = await TimelineWriter.statusTsukkomi({
        uid: auth.userID,
        text,
        createdAt: DateTime.now().toUnixInteger(),
        source: TimelineSource.Next,
      });
      return { id };
    },
  );

  app.delete(
    '/timeline/:timelineID',
    {
      schema: {
        summary: '删除时间线',
        operationId: 'deleteTimeline',
        tags: [Tag.Timeline],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          timelineID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('deleting a timeline')],
    },
    async ({ auth, params: { timelineID } }) => {
      const timeline = await fetchTimelineByID(auth, timelineID);
      if (!timeline) {
        throw new NotFoundError('timeline');
      }
      if (timeline.uid !== auth.userID) {
        throw new NotAllowedError('delete timeline');
      }
      await db.transaction(async (t) => {
        await t
          .delete(schema.chiiTimeline)
          .where(op.eq(schema.chiiTimeline.id, timelineID))
          .limit(1);
        await t
          .delete(schema.chiiTimelineComments)
          .where(op.eq(schema.chiiTimelineComments.mid, timelineID));
      });
      return {};
    },
  );

  app.get(
    '/timeline/:timelineID/replies',
    {
      schema: {
        summary: '获取时间线回复',
        operationId: 'getTimelineReplies',
        tags: [Tag.Timeline],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          timelineID: t.Integer(),
        }),
        response: {
          200: t.Array(res.Comment),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('timeline')),
          }),
        },
      },
    },
    async ({ auth, params: { timelineID } }) => {
      const timeline = await fetchTimelineByID(auth, timelineID);
      if (!timeline) {
        throw new NotFoundError('timeline');
      }
      return await comment.getAll(timelineID);
    },
  );

  app.post(
    '/timeline/:timelineID/replies',
    {
      schema: {
        summary: '创建时间线回复',
        operationId: 'createTimelineReply',
        tags: [Tag.Timeline],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          timelineID: t.Integer(),
        }),
        body: t.Intersect([req.Ref(req.CreateReply), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({ id: t.Integer() }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('creating a reply'), requireTurnstileToken()],
    },
    async ({ auth, body: { content, replyTo = 0 }, params: { timelineID } }) => {
      return await comment.create(auth, timelineID, content, replyTo);
    },
  );
}
