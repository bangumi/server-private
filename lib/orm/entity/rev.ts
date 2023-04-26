import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

import * as php from '@trim21/php-serialize';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const inflateRaw = promisify(zlib.inflateRaw);

@Index('rev_crt_id', ['revType', 'revMid'], {})
@Index('rev_crt_creator', ['revCreator'], {})
@Index('rev_id', ['revId', 'revType', 'revCreator'], {})
@Entity('chii_rev_history', { schema: 'bangumi' })
export class RevHistory {
  static episodeTypes = [
    18, // RevisionTypeEp
    181, // RevisionTypeEpMerge
    182, // RevisionTypeEpMove
    183, // RevisionTypeEpLock
    184, // RevisionTypeEpUnlock
    185, // RevisionTypeEpErase
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
  revDateline!: number;

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
          data: php.parse(await inflateRaw(x.revText)) as Record<number, R>,
        };
      }),
    );
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
