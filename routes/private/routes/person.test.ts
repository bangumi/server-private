import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { PersonCat } from '@app/lib/person/type.ts';
import redis from '@app/lib/redis.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './person.ts';

describe('person', () => {
  test('should get person', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person with collectedAt', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 14459,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1',
    });
    expect(res.statusCode).toBe(200);
    const person = res.json();
    expect(person.collectedAt).toEqual(1296496832);
  });

  test('should get person works', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/works',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person casts', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/casts',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person collects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/collects',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person indexes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/indexes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person relations', async () => {
    const relation = {
      relationID: 999999,
      personType: PersonCat.Person,
      personID: 7,
      relatedType: PersonCat.Person,
      relatedID: 900,
      relation: 1002,
      spoiler: false,
      ended: false,
      viceVersa: true,
      comment: '',
    } as const;
    const condition = op.and(
      op.eq(schema.chiiPersonRelations.personType, relation.personType),
      op.eq(schema.chiiPersonRelations.personID, relation.personID),
      op.eq(schema.chiiPersonRelations.relatedType, relation.relatedType),
      op.eq(schema.chiiPersonRelations.relatedID, relation.relatedID),
      op.eq(schema.chiiPersonRelations.relation, relation.relation),
    );
    const [existing] = await db.select().from(schema.chiiPersonRelations).where(condition).limit(1);
    if (!existing) {
      await db.insert(schema.chiiPersonRelations).values(relation);
    }

    try {
      const app = createTestServer({ auth: { allowNsfw: true } });
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: '/persons/7/relations',
        query: { limit: '10', offset: '0' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBeGreaterThan(0);
      expect(body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            person: expect.objectContaining({ id: 900 }),
            relation: expect.objectContaining({ id: 1002, cn: '配偶' }),
          }),
        ]),
      );
    } finally {
      if (!existing) {
        await db
          .delete(schema.chiiPersonRelations)
          .where(op.eq(schema.chiiPersonRelations.relationID, relation.relationID));
      }
    }
  });
});

describe('person comments', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiPrsnComments).where(op.eq(schema.chiiPrsnComments.mid, 1));
    await db.insert(schema.chiiPrsnComments).values({
      id: 12345670,
      mid: 1,
      content: '7月7日 77结婚',
      state: 0,
      createdAt: 1400517144,
      uid: 287622,
      related: 0,
    });
    await db.insert(schema.chiiPrsnComments).values({
      id: 12345671,
      mid: 1,
      content: '是6号结的',
      state: 0,
      createdAt: 1400517144,
      uid: 287622,
      related: 12345670,
    });
    await db.insert(schema.chiiPrsnComments).values({
      id: 12345672,
      mid: 1,
      content: '生日快乐！',
      state: 0,
      createdAt: 1400517144,
      uid: 287622,
      related: 0,
    });
  });

  afterEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiPrsnComments).where(op.eq(schema.chiiPrsnComments.mid, 1));
    await db
      .update(schema.chiiPersons)
      .set({
        comment: 110,
      })
      .where(op.eq(schema.chiiPersons.id, 1));
  });

  test('should get person comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/comments',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should create person comment', async () => {
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
      url: '/persons/1/comments',
      payload: { content: '恭喜恭喜', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const pstID: number = res.json().id;
    const [pst] = await db
      .select()
      .from(schema.chiiPrsnComments)
      .where(op.eq(schema.chiiPrsnComments.id, pstID));
    expect(pst?.content).toBe('恭喜恭喜');
  });

  test('should not allow create person comment', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/persons/1/comments',
      payload: { content: '恭喜恭喜', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});
