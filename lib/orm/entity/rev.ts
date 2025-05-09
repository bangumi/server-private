import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

import type { EntityManager } from 'typeorm';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import * as entity from '@app/lib/orm/entity/index.ts';
import { decode } from '@app/lib/utils';

const decompress = promisify(zlib.inflateRaw);
const compress = promisify(zlib.deflateRaw);

export const RevType = {
  subjectEdit: 1,
  subjectLock: 103,
  subjectUnlock: 104,

  characterEdit: 2, // 角色编辑
  personEdit: 3, // 人物编辑
  personMerge: 15,
  personErase: 16,

  episodeEdit: 18, // 章节

  // 章节管理
  episodeMerge: 181,
  episodeMove: 182,
  episodeLock: 183,
  episodeUnlock: 184,
  episodeErase: 185,
} as const;

// const TypeSubjectCharacterRelation = 5; // 条目->角色关联
// const TypeSubjectCastRelation = 6; // 条目->声优关联
// const TypeSubjectPersonRelation = 10; // 条目->人物关联
// const TypeSubjectMerge = 11; // 条目管理
// const TypeSubjectErase = 12;
// const TypeSubjectRelation = 17; // 条目关联
// const TypeSubjectLock = 103;
// const TypeSubjectUnlock = 104;
// const TypeCharacterSubjectRelation = 4; // 角色->条目关联
// const TypeCharacterCastRelation = 7; // 角色->声优关联
// const TypeCharacterMerge = 13; // 角色管理
// const TypeCharacterErase = 14;
// const TypePersonCastRelation = 8; // 人物->声优关联
// const TypePersonSubjectRelation = 9; // 人物->条目关联

@Index('rev_crt_id', ['revType', 'revMid'], {})
@Index('rev_crt_creator', ['revCreator'], {})
@Index('rev_id', ['revId', 'revType', 'revCreator'], {})
@Entity('chii_rev_history', { schema: 'bangumi' })
export class RevHistory {
  static episodeTypes = [
    RevType.episodeEdit,
    RevType.episodeMerge,
    RevType.episodeMove,
    RevType.episodeLock,
    RevType.episodeUnlock,
    RevType.episodeErase,
  ] as const;

  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'rev_id', unsigned: true })
  revId!: number;

  @Column('tinyint', {
    name: 'rev_type',
    comment: '条目，角色，人物',
    unsigned: true,
  })
  revType!: number;

  @Column('mediumint', {
    name: 'rev_mid',
    comment: '对应条目，人物的ID',
    unsigned: true,
  })
  revMid!: number;

  @Column('mediumint', { name: 'rev_text_id', unsigned: true })
  revTextId!: number;

  @Column('int', { name: 'rev_dateline', unsigned: true })
  createdAt!: number;

  @Column('mediumint', { name: 'rev_creator', unsigned: true })
  revCreator!: number;

  @Column('varchar', { name: 'rev_edit_summary', length: 200 })
  revEditSummary!: string;
}

@Entity('chii_rev_text', { schema: 'bangumi' })
export class RevText {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'rev_text_id',
    unsigned: true,
  })
  revTextId!: number;

  @Column('mediumblob', { name: 'rev_text' })
  revText!: Buffer;

  static async parse<R = unknown>(
    revTexts: RevText[],
  ): Promise<
    {
      id: number;
      data: Record<number, R>;
    }[]
  > {
    return await Promise.all(
      revTexts.map(async (x) => {
        return {
          id: x.revTextId,
          data: (await this.deserialize(x.revText)) as Record<number, R>,
        };
      }),
    );
  }

  static async deserialize(o: Buffer): Promise<Record<string, unknown>> {
    return decode(await decompress(o)) as Record<string, unknown>;
  }

  static async serialize(o: unknown): Promise<Buffer> {
    return await compress(JSON.stringify(o));
  }
}

@Index('rev_sid', ['revSid', 'revCreator'], {})
@Entity('chii_ep_revisions', { schema: 'bangumi' })
export class EpRevision {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'ep_rev_id',
    unsigned: true,
  })
  epRevId!: number;

  @Column('mediumint', { name: 'rev_sid', unsigned: true })
  revSid!: number;

  @Column('varchar', { name: 'rev_eids', length: 255 })
  revEids!: string;

  @Column('mediumtext', { name: 'rev_ep_infobox' })
  revEpInfobox!: string;

  @Column('mediumint', { name: 'rev_creator', unsigned: true })
  revCreator!: number;

  @Column('tinyint', {
    name: 'rev_version',
    unsigned: true,
    default: () => "'0'",
  })
  revVersion!: number;

  @Column('int', { name: 'rev_dateline', unsigned: true })
  revDateline!: number;

  @Column('varchar', { name: 'rev_edit_summary', length: 200 })
  revEditSummary!: string;
}

export interface EpTextRev {
  ep_sort: string;
  ep_disc: string;
  ep_type: string;
  ep_name: string;
  ep_name_cn: string;
  ep_duration: string;
  ep_airdate: string;
  ep_desc: string;
}

export interface PersonRev {
  crt_name: string;
  crt_infobox: string;
  crt_summary: string;
  extra: {
    img?: string;
  };
}

export async function createRevision(
  t: EntityManager,
  {
    mid,
    type,
    rev,
    creator,
    now = new Date(),
    comment,
  }: {
    mid: number;
    type: number;
    rev: unknown;
    creator: number;
    now?: Date;
    comment: string;
  },
) {
  const revText = await t.save(entity.RevText, {
    revText: await entity.RevText.serialize({}),
  });

  const revHistory = await t.save(entity.RevHistory, {
    revType: type,
    revCreator: creator,
    revTextId: revText.revTextId,
    createdAt: now.getTime() / 1000,
    revMid: mid,
    revEditSummary: comment,
  });

  revText.revText = await entity.RevText.serialize({ [revHistory.revId]: rev });
  await t.save(entity.RevText, revText);
}
