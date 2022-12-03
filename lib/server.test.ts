import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { expect, test } from '@jest/globals';

import { createServer } from './server';

const testClient = createMercuriusTestClient(createServer(), { url: '/v0/graphql' });

test('should works', async () => {
  expect(await testClient.query('query { subject(id: 8) { name_cn } }')).toEqual({
    data: {
      subject: { name_cn: 'Code Geass 反叛的鲁路修R2' },
    },
  });
});
