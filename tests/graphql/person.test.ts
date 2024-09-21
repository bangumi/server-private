import { gql } from 'graphql-tag';
import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

describe('person', () => {
  test('should get', async () => {
    await expect(
      testClient.query(gql`
        query {
          person(id: 1) {
            name
            career
          }
        }
      `),
    ).resolves.toEqual({
      data: {
        person: {
          name: '水樹奈々',
          career: ['artist', 'seiyu'],
        },
      },
    });
  });
});
