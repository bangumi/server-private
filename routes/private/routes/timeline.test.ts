import { request as httpRequest } from 'node:http';

import fastifySSE from '@fastify/sse';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { TIMELINE_EVENT_CHANNEL } from '@app/lib/timeline/cache';
import { initTimelineSubscriber } from '@app/lib/timeline/sse.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './timeline.ts';

const SSE_REQUEST_TIMEOUT = 7000;

async function createTimelineSay(
  app: ReturnType<typeof createTestServer>,
  content: string,
  createdIDs: number[],
) {
  const res = await app.inject({
    method: 'post',
    url: '/timeline',
    body: { content, turnstileToken: 'fake' },
  });
  expect(res.statusCode).toBe(200);
  const id = res.json().id as number;
  createdIDs.push(id);
  return id;
}

async function collectSSEBody(
  app: ReturnType<typeof createTestServer>,
  path: string,
  publish: () => Promise<void>,
) {
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const chunks: Buffer[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const req = httpRequest(
        `${address}${path}`,
        {
          headers: { accept: 'text/event-stream' },
        },
        (res) => {
          res.on('data', (chunk) => {
            chunks.push(chunk);
          });
          res.on('end', () => {
            cleanup();
            resolve();
          });
        },
      );
      const timer = setTimeout(() => {
        req.destroy();
      }, SSE_REQUEST_TIMEOUT);
      const cleanup = () => {
        clearTimeout(timer);
      };

      req.on('error', (err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
      req.on('close', () => {
        cleanup();
        resolve();
      });

      req.end();

      publish().catch((error) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
        req.destroy();
      });
    });
  } finally {
    await app.close();
  }

  return Buffer.concat(chunks).toString('utf8');
}

describe('timeline', () => {
  test('should get friends', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/timeline',
      query: { mode: 'friends' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('timeline status', () => {
  beforeEach(async () => {
    await db
      .delete(schema.chiiTimeline)
      .where(op.and(op.eq(schema.chiiTimeline.uid, 287622), op.eq(schema.chiiTimeline.cat, 5)));
  });

  afterEach(async () => {
    await db
      .delete(schema.chiiTimeline)
      .where(op.and(op.eq(schema.chiiTimeline.uid, 287622), op.eq(schema.chiiTimeline.cat, 5)));
  });

  test('should create timeline say', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/timeline',
      body: { content: '^_^\n(bgm38)>_<', turnstileToken: 'fake' },
    });
    expect(res.statusCode).toBe(200);
    const id = res.json().id;

    const [data] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(op.eq(schema.chiiTimeline.id, id))
      .limit(1);
    expect(data).toBeDefined();
    expect(data?.cat).toBe(5);
    expect(data?.type).toBe(1);
    expect(data?.memo).toBe('^_^\n(bgm38)&gt;_&lt;');
  });
});

describe('should get timeline events', () => {
  const testUserID = 287622;
  const createdTimelineIDs: number[] = [];

  beforeEach(async () => {
    await initTimelineSubscriber();
    await redis.flushdb();
  });

  afterEach(async () => {
    await redis.flushdb();
    if (createdTimelineIDs.length > 0) {
      await db
        .delete(schema.chiiTimeline)
        .where(op.inArray(schema.chiiTimeline.id, createdTimelineIDs));
      createdTimelineIDs.length = 0;
    }
  });

  test('should receive all timeline events without filter', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(fastifySSE);
    await app.register(setup);

    const firstID = await createTimelineSay(app, 'sse event 1', createdTimelineIDs);
    const secondID = await createTimelineSay(app, 'sse event 2', createdTimelineIDs);

    const body = await collectSSEBody(app, '/timeline/-/events', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await redis.publish(
        TIMELINE_EVENT_CHANNEL,
        JSON.stringify({ tml_id: firstID, cat: 5, uid: testUserID }), // Status
      );
      await redis.publish(
        TIMELINE_EVENT_CHANNEL,
        JSON.stringify({ tml_id: secondID, cat: 5, uid: testUserID }), // Status
      );
    });

    expect(body).toContain('data: {"event":"connected"}');
    expect(body).toContain(String(firstID));
    expect(body).toContain(String(secondID));
  }, 15000);

  test('should only receive filtered timeline events with cat filter', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(fastifySSE);
    await app.register(setup);

    const statusID = await createTimelineSay(app, 'status event', createdTimelineIDs);

    const body = await collectSSEBody(app, '/timeline/-/events?cat=5', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await redis.publish(
        TIMELINE_EVENT_CHANNEL,
        JSON.stringify({ tml_id: statusID, cat: 5, uid: testUserID }), // Status - 应该接收
      );
      await redis.publish(
        TIMELINE_EVENT_CHANNEL,
        JSON.stringify({ tml_id: 999999, cat: 3, uid: testUserID }), // Subject - 应该被过滤
      );
    });

    expect(body).toContain('data: {"event":"connected"}');
    expect(body).toContain(String(statusID));
    expect(body).not.toContain('999999');
  }, 15000);
});
