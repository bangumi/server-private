import { invalidateTokenCache } from '@app/lib/auth/index.ts';

import { EventOp, type KafkaMessage } from './type';

interface AccessTokenRow {
  access_token: string;
}

interface AccessTokenPayload {
  op: EventOp;
  before: AccessTokenRow | null;
  after: AccessTokenRow | null;
}

export async function handle({ value }: KafkaMessage) {
  const payload = JSON.parse(value.toString()) as AccessTokenPayload;
  switch (payload.op) {
    case EventOp.Update:
    case EventOp.Delete: {
      const token = payload.before?.access_token ?? payload.after?.access_token;
      if (token) {
        await invalidateTokenCache(token);
      }
      break;
    }
    default: {
      break;
    }
  }
}
