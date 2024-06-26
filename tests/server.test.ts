// remember to wrap all graphql string with gql,
// so vscode, webstorm and prettier will know the string content
// is graphql and support language specific features
import { gql } from 'graphql-tag';
import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

describe('graphql', () => {
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

describe('subject', () => {
  test('should get', async () => {
    await expect(
      testClient.query(gql`
        query {
          subject(id: 8) {
            name_cn
          }
        }
      `),
    ).resolves.toEqual({
      data: {
        subject: { name_cn: 'Code Geass 反叛的鲁路修R2' },
      },
    });
  });

  test('should not found', async () => {
    await expect(
      testClient.query(gql`
        query {
          subject(id: 4040404) {
            name_cn
          }
        }
      `),
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
      testClient.query(gql`
        query {
          subject(id: 16) {
            name_cn
          }
        }
      `),
    ).resolves.toEqual({
      data: {
        subject: null,
      },
    });
  });

  test('should get episodes, limit', async () => {
    const query = await testClient.query(gql`
      query {
        subject(id: 8) {
          id
          episodes(limit: 3) {
            id
          }
        }
      }
    `);

    expect(query.data.subject.id).toBe(8);
    expect(query.data.subject.episodes).toHaveLength(3);
  });

  test('should get episodes, -offset', async () => {
    const query = await testClient.query(gql`
      query {
        subject(id: 8) {
          id
          episodes(offset: -3) {
            id
          }
        }
      }
    `);

    expect(query.data.subject.id).toBe(8);
    expect(query.data.subject.episodes).toHaveLength(3);
  });

  test('should subject tags', async () => {
    const query = await testClient.query(gql`
      query {
        subject(id: 8) {
          tags(limit: 3) {
            name
            count
          }
        }
      }
    `);

    expect(query.data.subject).toMatchSnapshot();
  });

  test('should subject relations', async () => {
    const query = await testClient.query(gql`
      query {
        subject(id: 12) {
          relations(limit: 1) {
            relation
            subject {
              id
              name
            }
          }
        }
      }
    `);

    expect(query.data.subject.relations[0].relation).toBe(1004);
    expect(query.data.subject.relations[0].subject.id).toBe(11);
  });

  test('should subject relations with exclude', async () => {
    const query = await testClient.query(gql`
      query {
        subject(id: 12) {
          relations(limit: 1, excludeTypes: [1004]) {
            relation
            subject {
              id
              name
            }
          }
        }
      }
    `);

    expect(query.data.subject.relations).toHaveLength(0);
  });

  test('should reject nested subject relations', async () => {
    const query = await testClient.query(gql`
      query {
        subject(id: 12) {
          relations(limit: 1) {
            relation
            subject {
              id
              name
              relations(limit: 1) {
                relation
                subject {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `);

    expect(query).toMatchSnapshot();
  });
});

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
