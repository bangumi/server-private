import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './subject.ts';

describe('subject', () => {
  test('should get subject', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject episodes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/episodes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject relations', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/relations',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject characters', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/characters',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject staffs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/staffs',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/1/topics',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  // test('should fetch topic details', async () => {
  //   const app = createTestServer();
  //   await app.register(setup);
  //   const res = await app.inject({ url: '/subjects/-/topics/3', method: 'get' });
  //   expect(res.statusCode).toBe(200);
  //   expect(res.json()).toMatchSnapshot();
  // });
});
