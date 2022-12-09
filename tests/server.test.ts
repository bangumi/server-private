import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';
// remember to wrap all graphql string with gql,
// so vscode, webstorm and prettier will know the string content
// is graphql and support language specific features
import { gql } from 'graphql-tag';

import { createServer } from '../lib/server';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

describe('graphql', () => {
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
    ).resolves.toMatchSnapshot();
  });
});

describe('subject', () => {
  test('should get', async () => {
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

  test('should not found', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            subject(id: 4040404) {
              name_cn
            }
          }
        `,
      ),
    ).resolves.toEqual({
      data: {
        subject: null,
      },
    });
  });

  test('should return object for authorized request', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            subject(id: 16) {
              id
            }
          }
        `,
        {
          headers: { authorization: 'Bearer a_development_access_token' },
        },
      ),
    ).resolves.toEqual({
      data: {
        subject: { id: 16 },
      },
    });
  });

  test('should return null for non-authorized request', async () => {
    await expect(
      testClient.query(
        gql`
          query {
            subject(id: 16) {
              name_cn
            }
          }
        `,
      ),
    ).resolves.toEqual({
      data: {
        subject: null,
      },
    });
  });

  test('should get episodes, limit', async () => {
    const query = await testClient.query(
      gql`
        query {
          subject(id: 8) {
            id
            episodes(limit: 3) {
              id
            }
          }
        }
      `,
    );

    expect(query.data.subject.id).toBe(8);
    expect(query.data.subject.episodes).toHaveLength(3);
  });

  test('should get episodes, -offset', async () => {
    const query = await testClient.query(
      gql`
        query {
          subject(id: 8) {
            id
            episodes(offset: -3) {
              id
            }
          }
        }
      `,
    );

    expect(query.data.subject.id).toBe(8);
    expect(query.data.subject.episodes).toHaveLength(3);
  });

  test('should subject tags', async () => {
    const query = await testClient.query(
      gql`
        query {
          subject(id: 8) {
            tags(limit: 3) {
              name
              count
            }
          }
        }
      `,
    );

    expect(query.data.subject).toMatchSnapshot();
  });
});
