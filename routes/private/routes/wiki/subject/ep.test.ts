import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils';

import { setup } from './ep.ts';

async function testApp(...args: Parameters<typeof createTestServer>) {
  const app = createTestServer(...args);
  await app.register(setup);
  return app;
}

describe('edit subject ', () => {
  test('should get current wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/ep/8');

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "date": "",
        "duration": "",
        "ep": 6,
        "id": 8,
        "name": "蒼と白の境界線",
        "nameCN": "",
        "summary": "",
        "type": 0,
      }
    `);
  });
});
