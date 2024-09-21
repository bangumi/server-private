import { gql } from 'graphql-tag';
import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

describe('me', () => {
  test('should return current user', async () => {
    await expect(
      testClient.query(gql`
        query {
          me {
            id
          }
        }
      `),
    ).resolves.toEqual({
      data: {
        me: null,
      },
    });
  });

  test('should return current user', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            me {
              id
              username
              nickname
            }
          }
        `,
        {
          headers: { authorization: 'Bearer a_development_access_token' },
        },
      ),
    ).resolves.toEqual({
      data: {
        me: { id: 382951, username: '382951', nickname: '树洞酱' },
      },
    });
  });

  test('should return error', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            me {
              id
            }
          }
        `,
        {
          headers: { authorization: 'Bearer a' },
        },
      ),
    ).resolves.toMatchSnapshot();
  });
});
