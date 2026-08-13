import t from 'typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getRaKuenTopics } from '@app/lib/rakuen/index.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/rakuen/topics',
    {
      schema: {
        summary: '获取超展开聚合列表',
        description:
          '按最后回复时间倒序聚合全站讨论（小组话题/条目话题/章节/角色/人物），' +
          'type=my_group 时仅返回已加入小组的话题，未登录返回空数据。',
        operationId: 'getRaKuenTopics',
        tags: [Tag.RaKuen],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          type: t.Optional(req.Ref(req.RaKuenTopicType, { default: 'all' })),
          limit: t.Optional(
            t.Integer({ default: 50, minimum: 1, maximum: 200, description: 'min 1, max 200' }),
          ),
        }),
        response: {
          200: res.Paged(res.Ref(res.RaKuenTopic)),
        },
      },
    },
    async ({ auth, query: { type = req.IRaKuenTopicType.All, limit = 50 } }) => {
      return await getRaKuenTopics(auth, type, limit);
    },
  );
}
