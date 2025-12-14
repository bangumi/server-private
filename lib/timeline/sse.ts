import type { FastifyReply, FastifyRequest } from 'fastify';

import { logger } from '@app/lib/logger.ts';
import { TimelineSubscriber } from '@app/lib/redis.ts';
import { TIMELINE_EVENT_CHANNEL } from '@app/lib/timeline/cache';
import { fetchTimelineByID } from '@app/lib/timeline/item.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';

export interface TimelineEvent {
  tml_id: number;
  cat: number;
  uid: number;
}

class TimelineEventTarget extends EventTarget {
  emit(event: TimelineEvent) {
    this.dispatchEvent(new CustomEvent('timeline', { detail: event }));
  }

  on(handler: (event: TimelineEvent) => void) {
    const listener = (e: Event) => handler((e as CustomEvent<TimelineEvent>).detail);
    this.addEventListener('timeline', listener);
    return listener;
  }

  off(listener: (e: Event) => void) {
    this.removeEventListener('timeline', listener);
  }
}

export const timelineEvents = new TimelineEventTarget();

let initialized = false;

export async function initTimelineSubscriber() {
  if (initialized) return;
  initialized = true;

  await TimelineSubscriber.subscribe(TIMELINE_EVENT_CHANNEL);

  // Parse Redis message once and emit to all listeners
  TimelineSubscriber.on('message', (ch: string, msg: string) => {
    if (ch !== TIMELINE_EVENT_CHANNEL) return;

    try {
      const event = JSON.parse(msg) as TimelineEvent;
      timelineEvents.emit(event);
    } catch (error) {
      logger.error({ error, msg }, 'failed to parse timeline event');
    }
  });
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

  sseReply.sse.keepAlive();

  const onEvent = async (event: TimelineEvent) => {
    if (!sseReply.sse.isConnected) return;

    try {
      const { tml_id, cat, uid } = event;

      if (filterCat !== undefined && cat !== filterCat) return;
      if (mode === req.IFilterMode.Friends && friendIDs && !friendIDs.has(uid)) return;

      const timeline = await fetchTimelineByID(request.auth, tml_id);
      if (!timeline) return;

      timeline.user = await fetcher.fetchSlimUserByID(timeline.uid);

      if (sseReply.sse.isConnected) {
        await sseReply.sse.send({ data: { event: 'timeline', timeline } });
      }
    } catch (error) {
      logger.error({ error, event }, 'failed to process timeline SSE event');
    }
  };

  const listener = timelineEvents.on((event) => {
    void onEvent(event);
  });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    timelineEvents.off(listener);
  };

  request.raw.once('close', cleanup);

  await sseReply.sse.send({ data: { event: 'connected' } });

  sseReply.sse.onClose(cleanup);
}
