import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '@app/lib/auth';
import { Dam } from '@app/lib/dam';
import { BadRequestError, NotFoundError } from '@app/lib/error';
import { Security, Tag } from '@app/lib/openapi';
import * as orm from '@app/lib/orm';
import { requireLogin } from '@app/lib/rest/hooks/pre-handler';
import { BasicReply } from '@app/lib/rest/private/routes/topic';
import type { App } from '@app/lib/rest/type';
import * as Topic from '@app/lib/topic';
import { ReplyState } from '@app/lib/topic';
import { formatErrors } from '@app/lib/types/res';
import * as res from '@app/lib/types/res';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(BasicReply);

  app.put(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'editReply',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Group],
        response: {
          204: t.Void(),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotAllowedError('edit reply')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            text: t.String({ minLength: 1 }),
          },
          {
            examples: [{ text: 'new post contents' }],
          },
        ),
      },
      preHandler: [requireLogin('edit a post')],
    },
    /**
     * @param auth -
     * @param text - 回帖内容
     * @param topicID - 帖子 ID
     */
    async function ({ auth, body: { text }, params: { postID } }): Promise<void> {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }

      if (!Dam.allCharacterPrintable(text)) {
        throw new BadRequestError('text contains invalid invisible character');
      }

      const post = await orm.GroupPostRepo.findOneBy({ id: postID });
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('edit reply not created by you');
      }

      const topic = await Topic.fetchDetail(auth, 'group', post.topicID);
      if (!topic) {
        throw new NotFoundError(`topic ${post.topicID}`);
      }

      if (topic.state === ReplyState.AdminCloseTopic) {
        throw new NotAllowedError('edit reply in a closed topic');
      }

      if ([ReplyState.AdminDelete, ReplyState.UserDelete].includes(topic.state)) {
        throw new NotAllowedError('edit a deleted reply');
      }

      await orm.GroupPostRepo.update({ id: postID }, { content: text });

      return;
    },
  );
}
