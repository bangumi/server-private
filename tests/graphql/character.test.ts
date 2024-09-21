import { gql } from 'graphql-tag';
import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

describe('character', () => {
  test('should get', async () => {
    await expect(
      testClient.query(gql`
        query {
          character(id: 1) {
            name
            role
          }
        }
      `),
    ).resolves.toEqual({
      data: {
        character: { name: 'ルルーシュ・ランペルージ', role: 1 },
      },
    });
  });
});
