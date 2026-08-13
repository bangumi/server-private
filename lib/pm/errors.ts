import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';

/** 发件人自身被 ban_post 禁止（账户级，与收件人无关） */
export const PmSendBannedError = createError<[]>(
  'PM_SEND_BANNED',
  'you are not allowed to send private message',
  StatusCodes.FORBIDDEN,
);

/** 收件人侧拒绝：被拉黑 / 隐私 none / 隐私 friends（故意合并，保护隐私） */
export const PmSendNotAllowedError = createError<[]>(
  'PM_SEND_NOT_ALLOWED',
  'cannot send private message to this user',
  StatusCodes.FORBIDDEN,
);

export const PmReceiverNotFoundError = createError<[string]>(
  'PM_RECEIVER_NOT_FOUND',
  'user %s not found',
  StatusCodes.NOT_FOUND,
);

export const PmSendSelfError = createError<[]>(
  'PM_SEND_SELF',
  'cannot send private message to yourself',
  StatusCodes.BAD_REQUEST,
);

export const PmTooManyReceiversError = createError<[]>(
  'PM_TOO_MANY_RECEIVERS',
  'at most 10 receivers',
  StatusCodes.BAD_REQUEST,
);

export const PmContentInvalidError = createError<[string]>(
  'PM_CONTENT_INVALID',
  '%s contains invalid invisible character',
  StatusCodes.BAD_REQUEST,
);

/** 会话/消息不存在，或当前用户无权访问（故意合并为 404，避免探测） */
export const PmConversationNotFoundError = createError<[string]>(
  'PM_CONVERSATION_NOT_FOUND',
  'private message %s not found',
  StatusCodes.NOT_FOUND,
);
