import type { FastifyReply, FastifyRequest } from 'fastify';

import { Subscriber } from '@app/lib/redis.ts';
import { TIMELINE_EVENT_CHANNEL } from '@app/lib/timeline/cache';
import { fetchTimelineByIDs } from '@app/lib/timeline/item.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';

let timelineSubscribePromise: Promise<void> | null = null;

async function ensureTimelineSubscribed() {
  if (!timelineSubscribePromise) {
    timelineSubscribePromise = (async () => {
      if (Subscriber.status === 'end' || Subscriber.status === 'wait') {
        await Subscriber.connect();
      }
      await Subscriber.subscribe(TIMELINE_EVENT_CHANNEL);
    })();
  }
  try {
    await timelineSubscribePromise;
  } catch (error) {
    timelineSubscribePromise = null;
    throw error;
  }
}

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

  await ensureTimelineSubscribed();
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
    } catch {
      // ignore errors
    }
  };

  const messageHandler = (ch: string, msg: string) => {
    void onMessage(ch, msg);
  };
  Subscriber.addListener('message', messageHandler);

  const cleanup = () => {
    Subscriber.removeListener('message', messageHandler);
  };

  request.raw.on('close', cleanup);

  await sseReply.sse.send({ data: { type: 'connected' } });

  const heartbeatInterval = setInterval(() => {
    if (sseReply.sse.isConnected) {
      void sseReply.sse.send({ data: { type: 'heartbeat' } }).catch(() => {
        // ignore
      });
    }
  }, 30000);

  sseReply.sse.onClose(() => {
    clearInterval(heartbeatInterval);
    cleanup();
  });
}
