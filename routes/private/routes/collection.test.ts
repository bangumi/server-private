import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

import { setup } from './collection.ts';

describe('friends collection', () => {
  test('should get friends', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/friends',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get followers', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/followers',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('subject collection', () => {
  test('should get subject collections', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/collections/subjects',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('character collection', () => {
  test('should get character collections', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/collections/characters',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('person collection', () => {
  test('should get person collections', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/collections/persons',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('index collection', () => {
  test('should get index collections', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/collections/indexes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
