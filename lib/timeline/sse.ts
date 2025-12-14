import type { FastifyReply, FastifyRequest } from 'fastify';

import { logger } from '@app/lib/logger.ts';
import { Subscriber } from '@app/lib/redis.ts';
import { TIMELINE_EVENT_CHANNEL } from '@app/lib/timeline/cache';
import { fetchTimelineByIDs } from '@app/lib/timeline/item.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';

export async function handleTimelineSSE(
  request: FastifyRequest,
  reply: FastifyReply,
  filterCat: number | undefined,
  mode: string,
  friendIDs: Set<number> | null,
) {
  const sseReply = reply as FastifyReply & {
    sse: {
      isConnected: boolean;
      keepAlive: () => void;
      send: (data: { data: unknown }) => Promise<void>;
      onClose: (fn: () => void) => void;
    };
  };

  sseReply.sse.keepAlive();

  const onMessage = async (ch: string, msg: string) => {
    if (ch !== TIMELINE_EVENT_CHANNEL || !sseReply.sse.isConnected) return;

    try {
      const { tml_id, cat, uid } = JSON.parse(msg) as { tml_id: number; cat: number; uid: number };

      if (filterCat !== undefined && cat !== filterCat) return;
      if (mode === req.IFilterMode.Friends && friendIDs && !friendIDs.has(uid)) return;

      const timelines = await fetchTimelineByIDs(request.auth, [tml_id]);
      const timeline = timelines[tml_id];
      if (!timeline) return;

      const users = await fetcher.fetchSlimUsersByIDs([timeline.uid]);
      timeline.user = users[timeline.uid];

      if (sseReply.sse.isConnected) {
        await sseReply.sse.send({ data: timeline });
      }
    } catch (error) {
      logger.error({ error, msg }, 'failed to process timeline SSE message');
    }
  };

  const messageHandler = (ch: string, msg: string) => {
    void onMessage(ch, msg);
  };
  Subscriber.addListener('message', messageHandler);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    Subscriber.removeListener('message', messageHandler);
  };

  request.raw.once('close', cleanup);

  await sseReply.sse.send({ data: { type: 'connected' } });

  sseReply.sse.onClose(cleanup);
}
