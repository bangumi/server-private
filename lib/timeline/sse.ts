import type { FastifyReply, FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';

import { redisOption } from '@app/lib/redis.ts';
import { TIMELINE_EVENT_CHANNEL } from '@app/lib/timeline/cache';
import { fetchTimelineByIDs } from '@app/lib/timeline/item.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import type * as res from '@app/lib/types/res.ts';

interface SSEContext {
  request: FastifyRequest;
  reply: FastifyReply;
  filterCat?: number;
  mode: string;
  friendIDs: Set<number> | null;
  queue: number[];
  batchTimer: NodeJS.Timeout | null;
  subscriber: Redis;
  sseReply: FastifyReply & {
    sse: {
      isConnected: boolean;
      send: (data: { data: string }) => Promise<void>;
      onClose: (fn: () => void) => void;
    };
  };
}

const BATCH_SIZE = 10;
const BATCH_DELAY = 3000;

async function processBatch(context: SSEContext, ids: number[]): Promise<res.ITimeline[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const timelines = await fetchTimelineByIDs(context.request.auth, ids);
    const uids = Object.values(timelines)
      .map((t) => t.uid)
      .filter((uid, index, self) => self.indexOf(uid) === index);
    const users = await fetcher.fetchSlimUsersByIDs(uids);

    const results: res.ITimeline[] = [];
    for (const id of ids) {
      const timeline = timelines[id];
      if (!timeline) {
        continue;
      }

      if (context.filterCat !== undefined && timeline.cat !== context.filterCat) {
        continue;
      }

      if (
        context.mode === req.IFilterMode.Friends &&
        context.friendIDs &&
        !context.friendIDs.has(timeline.uid)
      ) {
        continue;
      }

      timeline.user = users[timeline.uid];
      results.push(timeline);
    }
    return results;
  } catch {
    return [];
  }
}

function createMessageCallback(context: SSEContext, channel: string) {
  return (ch: string, msg: string) => {
    if (ch !== channel) {
      return;
    }

    try {
      const { tml_id, cat, uid } = JSON.parse(msg) as {
        tml_id: number;
        cat: number;
        uid: number;
      };
      if (context.filterCat !== undefined && cat !== context.filterCat) {
        return;
      }
      if (
        context.mode === req.IFilterMode.Friends &&
        context.friendIDs &&
        !context.friendIDs.has(uid)
      ) {
        return;
      }
      context.queue.push(tml_id);

      if (context.queue.length >= BATCH_SIZE) {
        if (context.batchTimer) {
          clearTimeout(context.batchTimer);
          context.batchTimer = null;
        }
      } else if (!context.batchTimer) {
        context.batchTimer = setTimeout(() => {
          context.batchTimer = null;
        }, BATCH_DELAY);
      }
    } catch {
      // ignore parse errors
    }
  };
}

function createCleanup(
  context: SSEContext,
  callback: (ch: string, msg: string) => void,
  channel: string,
) {
  return () => {
    if (context.batchTimer) {
      clearTimeout(context.batchTimer);
      context.batchTimer = null;
    }
    context.subscriber.removeListener('message', callback);
    context.subscriber.unsubscribe(channel).catch(() => {
      // ignore unsubscribe errors
    });
    context.subscriber.quit().catch(() => {
      // ignore quit errors
    });
  };
}

async function startProcessLoop(context: SSEContext) {
  while (context.sseReply.sse.isConnected) {
    if (
      context.queue.length >= BATCH_SIZE ||
      (context.batchTimer === null && context.queue.length > 0)
    ) {
      const ids = context.queue.splice(0, BATCH_SIZE);
      const timelines = await processBatch(context, ids);
      for (const timeline of timelines) {
        if (context.sseReply.sse.isConnected) {
          try {
            await context.sseReply.sse.send({ data: timeline });
          } catch {
            return;
          }
        } else {
          return;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
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
      send: (data: { data: string }) => Promise<void>;
      onClose: (fn: () => void) => void;
    };
  };
  const channel = TIMELINE_EVENT_CHANNEL;
  const subscriber = new Redis(redisOption);
  await subscriber.connect();
  sseReply.sse.keepAlive();

  const context: SSEContext = {
    request,
    reply,
    filterCat,
    mode,
    friendIDs,
    queue: [],
    batchTimer: null,
    subscriber,
    sseReply,
  };

  const callback = createMessageCallback(context, channel);
  const cleanup = createCleanup(context, callback, channel);

  await subscriber.subscribe(channel);
  subscriber.addListener('message', callback);

  request.raw.on('close', cleanup);

  await sseReply.sse.send({ data: { type: 'connected' } });

  const heartbeatInterval = setInterval(() => {
    if (sseReply.sse.isConnected) {
      void sseReply.sse.send({ data: { type: 'heartbeat' } }).catch(() => {
        // connection might have closed
      });
    }
  }, 30000);

  sseReply.sse.onClose(() => {
    clearInterval(heartbeatInterval);
    cleanup();
  });

  void startProcessLoop(context).catch(() => {
    // loop already stops when connection closes, errors are not fatal
  });
}
