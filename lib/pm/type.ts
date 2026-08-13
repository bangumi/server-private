/** 私信相关常量与类型 */

export const PMFolder = Object.freeze({
  Inbox: 'inbox',
  Outbox: 'outbox',
} as const);

export type PMFolder = (typeof PMFolder)[keyof typeof PMFolder];

/** Redis pub/sub channel 前缀，完整 channel 为 `${PREFIX}${uid}` */
export const PM_EVENT_CHANNEL_PREFIX = 'event-user-pm-';

export function getPmEventChannel(uid: number): string {
  return `${PM_EVENT_CHANNEL_PREFIX}${uid}`;
}

/** Socket.io 推送的新私信事件载荷 */
export interface PmEvent {
  /** 新消息 id */
  msgID: number;
  /** 会话根消息 id */
  related: number;
  /** 接收者未读私信总数 */
  count: number;
}
