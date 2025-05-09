import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { CollectionType, EpisodeCollectionStatus, SubjectType } from '@app/lib/subject/type';
import { decode } from '@app/lib/utils/index.ts';

import { TimelineCat, TimelineMonoType, TimelineSource, TimelineStatusType } from './type';
import { TimelineMonoCat } from './type';
import { TimelineWriter } from './writer';

describe('TimelineWriter', () => {
  beforeEach(async () => {
    await db.delete(schema.chiiTimeline).where(op.eq(schema.chiiTimeline.uid, 1));
  });

  afterEach(async () => {
    await db.delete(schema.chiiTimeline).where(op.eq(schema.chiiTimeline.uid, 1));
  });

  describe('subject', () => {
    test('should create new timeline entry', async () => {
      const payload = {
        uid: 1,
        subject: {
          id: 100,
          type: SubjectType.Anime,
        },
        collect: {
          id: 200,
          type: CollectionType.Collect,
          rate: 8,
          comment: 'Great anime!',
        },
        createdAt: DateTime.now().toUnixInteger(),
        source: TimelineSource.Web,
      };

      const id = await TimelineWriter.subject(payload);
      expect(id).toBeGreaterThan(0);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(
          op.and(op.eq(schema.chiiTimeline.id, id), op.eq(schema.chiiTimeline.uid, payload.uid)),
        );

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.cat).toBe(TimelineCat.Subject);
      expect(entry.type).toBe(6); // Anime collect type
      expect(entry.related).toBe(payload.subject.id.toString());

      const memo = decode(entry.memo);
      expect(memo).toEqual({
        subject_id: payload.subject.id,
        collect_id: payload.collect.id,
        collect_comment: payload.collect.comment,
        collect_rate: payload.collect.rate,
      });
    });

    test('should update previous entry if within 10 minutes', async () => {
      const now = DateTime.now();
      const payload1 = {
        uid: 1,
        subject: {
          id: 100,
          type: SubjectType.Anime,
        },
        collect: {
          id: 200,
          type: CollectionType.Collect,
          rate: 8,
          comment: 'First comment',
        },
        createdAt: now.toUnixInteger(),
        source: TimelineSource.Web,
      };

      const firstId = await TimelineWriter.subject(payload1);

      const payload2 = {
        ...payload1,
        subject: {
          id: 101,
          type: SubjectType.Anime,
        },
        collect: {
          ...payload1.collect,
          id: 201,
          comment: 'Second comment',
        },
        createdAt: now.plus({ minutes: 5 }).toUnixInteger(),
      };

      const secondId = await TimelineWriter.subject(payload2);
      expect(secondId).toBe(firstId);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, firstId));

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.batch).toBe(true);

      const memo = decode(entry.memo) as Record<string, { collect_comment: string }>;
      expect(memo).toHaveProperty('100');
      expect(memo).toHaveProperty('101');
      expect(memo['100']?.collect_comment).toBe('First comment');
      expect(memo['101']?.collect_comment).toBe('Second comment');
    });
  });

  describe('progressEpisode', () => {
    test('should create new progress entry', async () => {
      const payload = {
        uid: 1,
        subject: {
          id: 100,
          type: SubjectType.Anime,
        },
        episode: {
          id: 1,
          status: EpisodeCollectionStatus.Done,
        },
        createdAt: DateTime.now().toUnixInteger(),
        source: TimelineSource.Web,
      };

      const id = await TimelineWriter.progressEpisode(payload);
      expect(id).toBeGreaterThan(0);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, id));

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.cat).toBe(TimelineCat.Progress);
      expect(entry.type).toBe(EpisodeCollectionStatus.Done);

      const memo = decode(entry.memo);
      expect(memo).toEqual({
        subject_id: payload.subject.id,
        subject_type_id: payload.subject.type,
        ep_id: payload.episode.id,
      });
    });

    test('should update previous entry if within 10 minutes and same subject', async () => {
      const now = DateTime.now();
      const payload1 = {
        uid: 1,
        subject: {
          id: 100,
          type: SubjectType.Anime,
        },
        episode: {
          id: 1,
          status: EpisodeCollectionStatus.Done,
        },
        createdAt: now.toUnixInteger(),
        source: TimelineSource.Web,
      };

      const firstId = await TimelineWriter.progressEpisode(payload1);

      const payload2 = {
        ...payload1,
        episode: {
          id: 2,
          status: EpisodeCollectionStatus.Done,
        },
        createdAt: now.plus({ minutes: 5 }).toUnixInteger(),
      };

      const secondId = await TimelineWriter.progressEpisode(payload2);
      expect(secondId).toBe(firstId);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, firstId));

      if (!entry) {
        throw new Error('Entry not found');
      }

      const memo = decode(entry.memo) as { ep_id: number };
      expect(memo.ep_id).toBe(payload2.episode.id);
    });
  });

  describe('progressSubject', () => {
    test('should create new subject progress entry', async () => {
      const payload = {
        uid: 1,
        subject: {
          id: 100,
          type: SubjectType.Anime,
          eps: 12,
          volumes: 0,
        },
        collect: {
          epsUpdate: 6,
        },
        createdAt: DateTime.now().toUnixInteger(),
        source: TimelineSource.Web,
      };

      const id = await TimelineWriter.progressSubject(payload);
      expect(id).toBeGreaterThan(0);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, id));

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.cat).toBe(TimelineCat.Progress);
      expect(entry.type).toBe(0);

      const memo = decode(entry.memo);
      expect(memo).toEqual({
        subject_id: payload.subject.id,
        subject_type_id: payload.subject.type,
        eps_total: payload.subject.eps.toString(),
        eps_update: payload.collect.epsUpdate,
        vols_total: '??',
      });
    });

    test('should update previous entry if within 10 minutes and same subject', async () => {
      const now = DateTime.now();
      const payload1 = {
        uid: 1,
        subject: {
          id: 100,
          type: SubjectType.Anime,
          eps: 12,
          volumes: 0,
        },
        collect: {
          epsUpdate: 6,
        },
        createdAt: now.toUnixInteger(),
        source: TimelineSource.Web,
      };

      const firstId = await TimelineWriter.progressSubject(payload1);

      const payload2 = {
        ...payload1,
        collect: {
          epsUpdate: 8,
        },
        createdAt: now.plus({ minutes: 5 }).toUnixInteger(),
      };

      const secondId = await TimelineWriter.progressSubject(payload2);
      expect(secondId).toBe(firstId);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, firstId));

      if (!entry) {
        throw new Error('Entry not found');
      }

      const memo = decode(entry.memo) as { eps_update: number };
      expect(memo.eps_update).toBe(payload2.collect.epsUpdate);
    });
  });

  describe('statusTsukkomi', () => {
    test('should create new tsukkomi status', async () => {
      const payload = {
        uid: 1,
        text: 'Test tsukkomi message',
        createdAt: DateTime.now().toUnixInteger(),
        source: TimelineSource.Web,
      };

      const id = await TimelineWriter.statusTsukkomi(payload);
      expect(id).toBeGreaterThan(0);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, id));

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.cat).toBe(TimelineCat.Status);
      expect(entry.type).toBe(TimelineStatusType.Tsukkomi);
      expect(entry.memo).toBe(payload.text);
    });
  });

  describe('mono', () => {
    test('should create new mono entry', async () => {
      const payload = {
        uid: 1,
        cat: TimelineMonoCat.Person,
        type: TimelineMonoType.Collected,
        id: 100,
        createdAt: DateTime.now().toUnixInteger(),
        source: TimelineSource.Web,
      };

      const id = await TimelineWriter.mono(payload);
      expect(id).toBeGreaterThan(0);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, id));

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.cat).toBe(TimelineCat.Mono);
      expect(entry.type).toBe(payload.type);
      expect(entry.related).toBe(payload.id.toString());

      const memo = decode(entry.memo);
      expect(memo).toEqual({
        cat: payload.cat,
        id: payload.id,
      });
    });

    test('should update previous entry if within 10 minutes', async () => {
      const now = DateTime.now();
      const payload1 = {
        uid: 1,
        cat: TimelineMonoCat.Person,
        type: TimelineMonoType.Collected,
        id: 100,
        createdAt: now.toUnixInteger(),
        source: TimelineSource.Web,
      };

      const firstId = await TimelineWriter.mono(payload1);

      const payload2 = {
        ...payload1,
        id: 101,
        createdAt: now.plus({ minutes: 5 }).toUnixInteger(),
      };

      const secondId = await TimelineWriter.mono(payload2);
      expect(secondId).toBe(firstId);

      const [entry] = await db
        .select()
        .from(schema.chiiTimeline)
        .where(op.eq(schema.chiiTimeline.id, firstId));

      if (!entry) {
        throw new Error('Entry not found');
      }

      expect(entry.batch).toBe(true);

      const memo = decode(entry.memo) as Record<string, { cat: number }>;
      expect(memo).toHaveProperty('100');
      expect(memo).toHaveProperty('101');
      expect(memo['100']?.cat).toBe(TimelineMonoCat.Person);
      expect(memo['101']?.cat).toBe(TimelineMonoCat.Person);
    });
  });
});
