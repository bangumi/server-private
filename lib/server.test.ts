import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from '@jest/globals';
import { gql } from 'graphql-tag';

import { createServer } from './server';

const testClient = createMercuriusTestClient(createServer(), { url: '/v0/graphql' });

test('should works', async () => {
  await expect(
    testClient.query(
      gql`
        query {
          subject(id: 8) {
            name_cn
          }
        }
      `,
    ),
  ).resolves.toEqual({
    data: {
      subject: { name_cn: 'Code Geass 反叛的鲁路修R2' },
    },
  });
});

describe('auth', () => {
  test('should return current user', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            me {
              ID
            }
          }
        `,
      ),
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
              ID
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
        me: { ID: 382951, username: '382951', nickname: '树洞酱' },
      },
    });
  });

  test('should return error', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            me {
              ID
            }
          }
        `,
        {
          headers: { authorization: 'Bearer a' },
        },
      ),
    ).resolves.toEqual({
      code: 'TOKEN_INVALID',
      error: 'Unauthorized',
      message: "can't find user by access token",
      statusCode: 401,
    });
  });
});
