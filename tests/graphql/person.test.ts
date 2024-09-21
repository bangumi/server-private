import { gql } from 'graphql-tag';
import { createMercuriusTestClient } from 'mercurius-integration-testing';
import { describe, expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

const testClient = createMercuriusTestClient(await createServer(), { url: '/v0/graphql' });

describe('person', () => {
  test('should get', async () => {
    const res = await testClient.query(gql`
      query {
        person(id: 1) {
          name
          career
        }
      }
    `);

    expect(res).toMatchSnapshot();
  });

  test('should person subjects', async () => {
    const res = await testClient.query(gql`
      query {
        person(id: 39) {
          subjects(limit: 1) {
            subject {
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
});
