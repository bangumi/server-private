import { gql } from 'graphql-tag';
import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

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
    const res = await testClient.query(gql`
      query {
        subject(id: 8) {
          id
          episodes(limit: 3) {
            id
          }
        }
      }
    `);

    expect(res.data.subject.id).toBe(8);
    expect(res.data.subject.episodes).toHaveLength(3);
  });

  test('should get episodes, -offset', async () => {
    const res = await testClient.query(gql`
      query {
        subject(id: 8) {
          id
          episodes(offset: -3) {
            id
          }
        }
      }
    `);

    expect(res.data.subject.id).toBe(8);
    expect(res.data.subject.episodes).toHaveLength(3);
  });

  test('should subject tags', async () => {
    const res = await testClient.query(gql`
      query {
        subject(id: 8) {
          tags(limit: 3) {
            name
            count
          }
        }
      }
    `);

    expect(res.data.subject).toMatchSnapshot();
  });

  test('should subject relations', async () => {
    const res = await testClient.query(gql`
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

    expect(res.data.subject.relations[0].relation).toBe(1004);
    expect(res.data.subject.relations[0].subject.id).toBe(11);
  });

  test('should subject relations with exclude', async () => {
    const res = await testClient.query(gql`
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

    expect(res.data.subject.relations).toHaveLength(0);
  });

  test('should subject characters', async () => {
    const res = await testClient.query(gql`
      query {
        subject(id: 12) {
          characters(limit: 3) {
            character {
              id
              name
            }
            order
            type
          }
        }
      }
    `);

    expect(res).toMatchSnapshot();
  });

  test('should subject persons', async () => {
    const res = await testClient.query(gql`
      query {
        subject(id: 12) {
          persons(limit: 3) {
            person {
              id
              name
            }
            position
          }
        }
      }
    `);

    expect(res).toMatchSnapshot();
  });

  test('should subject topics', async () => {
    const res = await testClient.query(gql`
      query {
        subject(id: 12) {
          topics(limit: 1) {
            id
            creator {
              id
              username
              nickname
            }
            created_at
            title
            replies
            state
            display
          }
        }
      }
    `);

    expect(res).toMatchSnapshot();
  });
});
