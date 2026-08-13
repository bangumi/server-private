import t from 'typebox';

import { Dam } from '@app/lib/dam.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import {
  PmContentInvalidError,
  PmConversationNotFoundError,
  PmReceiverNotFoundError,
  PmSendBannedError,
  PmSendNotAllowedError,
  PmSendSelfError,
  PmTooManyReceiversError,
} from '@app/lib/pm/errors.ts';
import { PMFolder } from '@app/lib/pm/type.ts';
import {
  deleteConversation,
  deleteMessage,
  getConversation,
  getMailboxStatus,
  listConversations,
  listRecentContacts,
  markConversationReadByMessageID,
  resolveReceivers,
  sendPrivateMessage,
} from '@app/lib/pm/utils.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/pm',
    {
      schema: {
        summary: '获取私信邮箱状态',
        operationId: 'getPrivateMessageStatus',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(res.PrivateMessageStatus),
        },
      },
      preHandler: [requireLogin('get private message status')],
    },
    async ({ auth }) => {
      return getMailboxStatus(auth.userID);
    },
  );

  app.get(
    '/pm/inbox',
    {
      schema: {
        summary: '获取收件箱会话列表',
        operationId: 'listPrivateMessageInbox',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.PrivateMessageConversation)),
        },
      },
      preHandler: [requireLogin('list private message inbox')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      return listConversations(auth.userID, PMFolder.Inbox, limit, offset);
    },
  );

  app.get(
    '/pm/outbox',
    {
      schema: {
        summary: '获取发件箱会话列表',
        operationId: 'listPrivateMessageOutbox',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.PrivateMessageConversation)),
        },
      },
      preHandler: [requireLogin('list private message outbox')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      return listConversations(auth.userID, PMFolder.Outbox, limit, offset);
    },
  );

  app.get(
    '/pm/contacts',
    {
      schema: {
        summary: '获取最近私信联系人',
        operationId: 'listPrivateMessageContacts',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: t.Array(res.Ref(res.PrivateMessageContact)),
        },
      },
      preHandler: [requireLogin('list private message contacts')],
    },
    async ({ auth }) => {
      return listRecentContacts(auth.userID);
    },
  );

  app.post(
    '/pm',
    {
      schema: {
        summary: '发送私信',
        operationId: 'createPrivateMessage',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: req.Ref(req.CreatePrivateMessage),
        response: {
          200: t.Object({
            messages: t.Array(
              t.Object({
                receiverID: t.Integer(),
                msgID: t.Integer(),
              }),
            ),
          }),
          ...res.errorResponses(
            PmSendBannedError(),
            PmSendNotAllowedError(),
            PmReceiverNotFoundError('user'),
            PmSendSelfError(),
            PmTooManyReceiversError(),
            PmContentInvalidError('title'),
          ),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('send private message')],
    },
    async ({ auth, body: { receivers, receiverIDs, title, content, related = 0 } }) => {
      if (auth.permission.ban_post) {
        throw new PmSendBannedError();
      }
      if (!Dam.allCharacterPrintable(title)) {
        throw new PmContentInvalidError('title');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new PmContentInvalidError('content');
      }

      await rateLimit(LimitAction.Pm, auth.userID);

      const receiverUsers = await resolveReceivers(auth.userID, {
        usernames: receivers,
        receiverIDs,
      });
      const result = await sendPrivateMessage(auth.userID, receiverUsers, title, content, related);

      return { messages: result.messages };
    },
  );

  app.get(
    '/pm/conversations/:msgID',
    {
      schema: {
        summary: '获取私信会话详情',
        operationId: 'getPrivateMessageConversation',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          msgID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.PrivateMessageConversationDetail),
          ...res.errorResponses(PmConversationNotFoundError('message')),
        },
      },
      preHandler: [requireLogin('get private message conversation')],
    },
    async ({ auth, params: { msgID } }) => {
      return getConversation(auth.userID, msgID);
    },
  );

  app.put(
    '/pm/conversations/:msgID/read',
    {
      schema: {
        summary: '标记私信会话已读',
        operationId: 'markPrivateMessageConversationRead',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          msgID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          ...res.errorResponses(PmConversationNotFoundError('message')),
        },
      },
      preHandler: [requireLogin('mark private message read')],
    },
    async ({ auth, params: { msgID } }) => {
      await markConversationReadByMessageID(auth.userID, msgID);
      return {};
    },
  );

  app.delete(
    '/pm/conversations/:msgID',
    {
      schema: {
        summary: '删除私信会话',
        description: '仅对当前用户软删除，不影响会话对方',
        operationId: 'deletePrivateMessageConversation',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          msgID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          ...res.errorResponses(PmConversationNotFoundError('message')),
        },
      },
      preHandler: [requireLogin('delete private message conversation')],
    },
    async ({ auth, params: { msgID } }) => {
      await deleteConversation(auth.userID, msgID);
      return {};
    },
  );

  app.delete(
    '/pm/:msgID',
    {
      schema: {
        summary: '删除单条私信',
        description: '仅对当前用户软删除，不影响对方',
        operationId: 'deletePrivateMessage',
        tags: [Tag.Pm],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          msgID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          ...res.errorResponses(PmConversationNotFoundError('message')),
        },
      },
      preHandler: [requireLogin('delete private message')],
    },
    async ({ auth, params: { msgID } }) => {
      await deleteMessage(auth.userID, msgID);
      return {};
    },
  );
}
