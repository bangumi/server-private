import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  customType,
  date,
  float,
  int,
  mediumint,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  smallint,
  timestamp,
  tinyint,
  varchar,
  year,
} from 'drizzle-orm/mysql-core';
import * as lo from 'lodash-es';

const customBoolean = customType<{ data: boolean }>({
  dataType() {
    return 'tinyint';
  },
  fromDriver(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 1;
  },

  toDriver(value) {
    return value ? 1 : 0;
  },
});

const htmlEscapedString = (t: string) =>
  customType<{ data: string; driverData: string }>({
    dataType() {
      return t;
    },
    fromDriver(value) {
      return lo.unescape(value);
    },

    toDriver(value) {
      return lo.escape(value);
    },
  });

const mediumblob = (name: string) =>
  customType<{ data: Buffer; driverData: string }>({
    dataType() {
      return 'mediumblob';
    },
    fromDriver(value) {
      return Buffer.from(value);
    },

    toDriver(value: Buffer): string {
      // @ts-expect-error https://github.com/drizzle-team/drizzle-orm/issues/1188
      return value;
    },
  })(name);

export const chiiApp = mysqlTable('chii_apps', {
  id: mediumint('app_id').autoincrement().notNull(),
  type: tinyint('app_type').notNull(),
  creator: mediumint('app_creator').notNull(),
  name: varchar('app_name', { length: 255 }).notNull(),
  description: mediumtext('app_desc').notNull(),
  url: varchar('app_url', { length: 2000 }).notNull(),
  collects: mediumint('app_collects').notNull(),
  status: tinyint('app_status').notNull(),
  createdAt: int('app_timestamp').notNull(),
  updatedAt: int('app_lasttouch').notNull(),
  deleted: tinyint('app_ban').notNull(),
});

export const chiiCharacters = mysqlTable('chii_characters', {
  id: mediumint('crt_id').autoincrement().notNull(),
  name: htmlEscapedString('varchar')('crt_name', { length: 255 }).notNull(),
  role: tinyint('crt_role').notNull(),
  infobox: htmlEscapedString('mediumtext')('crt_infobox').notNull(),
  summary: mediumtext('crt_summary').notNull(),
  img: varchar('crt_img', { length: 255 }).notNull(),
  comment: mediumint('crt_comment').notNull(),
  collects: mediumint('crt_collects').notNull(),
  createdAt: int('crt_dateline').notNull(),
  updatedAt: int('crt_lastpost').notNull(),
  lock: tinyint('crt_lock').default(0).notNull(),
  anidbImg: varchar('crt_img_anidb', { length: 255 }).notNull(),
  anidbId: mediumint('crt_anidb_id').notNull(),
  ban: tinyint('crt_ban').default(0).notNull(),
  redirect: int('crt_redirect').default(0).notNull(),
  nsfw: customBoolean('crt_nsfw').notNull(),
});

export const chiiCharacterCasts = mysqlTable('chii_crt_cast_index', {
  characterID: mediumint('crt_id').notNull(),
  personID: mediumint('prsn_id').notNull(),
  subjectID: mediumint('subject_id').notNull(),
  subjectType: tinyint('subject_type_id').notNull(),
  summary: htmlEscapedString('varchar')('summary', { length: 255 }).notNull(),
});

export const chiiCrtComments = mysqlTable('chii_crt_comments', {
  id: mediumint('crt_pst_id').autoincrement().notNull(),
  mid: mediumint('crt_pst_mid').notNull(),
  uid: mediumint('crt_pst_uid').notNull(),
  related: mediumint('crt_pst_related').notNull(),
  createdAt: int('crt_pst_dateline').notNull(),
  content: htmlEscapedString('mediumtext')('crt_pst_content').notNull(),
  state: tinyint('crt_pst_state').notNull(),
});

export const chiiCharacterSubjects = mysqlTable('chii_crt_subject_index', {
  characterID: mediumint('crt_id').notNull(),
  subjectID: mediumint('subject_id').notNull(),
  subjectType: tinyint('subject_type_id').notNull(),
  type: tinyint('crt_type').notNull(),
  appearEps: mediumtext('ctr_appear_eps').notNull(),
  order: smallint('crt_order').notNull(),
});

export const chiiEpisodes = mysqlTable('chii_episodes', {
  id: mediumint('ep_id').autoincrement().notNull(),
  subjectID: mediumint('ep_subject_id').notNull(),
  sort: float('ep_sort').notNull(),
  type: tinyint('ep_type').notNull(),
  disc: tinyint('ep_disc').default(0).notNull(),
  name: htmlEscapedString('varchar')('ep_name', { length: 80 }).notNull(),
  nameCN: htmlEscapedString('varchar')('ep_name_cn', { length: 80 }).notNull(),
  rate: tinyint('ep_rate').notNull(),
  duration: varchar('ep_duration', { length: 80 }).notNull(),
  airdate: varchar('ep_airdate', { length: 80 }).notNull(),
  online: mediumtext('ep_online').notNull(),
  comment: mediumint('ep_comment').notNull(),
  resources: mediumint('ep_resources').notNull(),
  desc: mediumtext('ep_desc').notNull(),
  createdAt: int('ep_dateline').notNull(),
  updatedAt: int('ep_lastpost').notNull(),
  lock: tinyint('ep_lock').default(0).notNull(),
  ban: tinyint('ep_ban').default(0).notNull(),
});

export const chiiEpComments = mysqlTable('chii_ep_comments', {
  id: mediumint('ep_pst_id').autoincrement().notNull(),
  mid: mediumint('ep_pst_mid').notNull(),
  uid: mediumint('ep_pst_uid').notNull(),
  related: mediumint('ep_pst_related').notNull(),
  createdAt: int('ep_pst_dateline').notNull(),
  content: htmlEscapedString('mediumtext')('ep_pst_content').notNull(),
  state: tinyint('ep_pst_state').notNull(),
});

export const chiiEpRevisions = mysqlTable('chii_ep_revisions', {
  epRevId: mediumint('ep_rev_id').autoincrement().notNull(),
  revSid: mediumint('rev_sid').notNull(),
  revEids: varchar('rev_eids', { length: 255 }).notNull(),
  revEpInfobox: mediumtext('rev_ep_infobox').notNull(),
  revCreator: mediumint('rev_creator').notNull(),
  revVersion: tinyint('rev_version').default(0).notNull(),
  revDateline: int('rev_dateline').notNull(),
  revEditSummary: varchar('rev_edit_summary', { length: 200 }).notNull(),
});

export const chiiEpStatus = mysqlTable('chii_ep_status', {
  id: mediumint('ep_stt_id').autoincrement().notNull(),
  uid: mediumint('ep_stt_uid').notNull(),
  sid: mediumint('ep_stt_sid').notNull(),
  status: mediumtext('ep_stt_status').notNull(),
  updatedAt: int('ep_stt_lasttouch').notNull(),
});

export const chiiFriends = mysqlTable('chii_friends', {
  uid: mediumint('frd_uid').notNull(),
  fid: mediumint('frd_fid').notNull(),
  grade: tinyint('frd_grade').default(1).notNull(),
  createdAt: int('frd_dateline').default(0).notNull(),
  description: char('frd_description', { length: 255 }).notNull(),
});

export const chiiGroups = mysqlTable('chii_groups', {
  id: smallint('grp_id').autoincrement().notNull(),
  cat: smallint('grp_cat').notNull(),
  name: char('grp_name', { length: 50 }).notNull(),
  title: htmlEscapedString('varchar')('grp_title', { length: 50 }).notNull(),
  icon: varchar('grp_icon', { length: 255 }).notNull(),
  creator: mediumint('grp_creator').notNull(),
  topics: mediumint('grp_topics').notNull(),
  posts: mediumint('grp_posts').notNull(),
  members: mediumint('grp_members').default(1).notNull(),
  desc: htmlEscapedString('text')('grp_desc').notNull(),
  updatedAt: int('grp_lastpost').notNull(),
  createdAt: int('grp_builddate').notNull(),
  accessible: customBoolean('grp_accessible').default(true).notNull(),
  nsfw: customBoolean('grp_nsfw').notNull(),
});

export const chiiGroupMembers = mysqlTable('chii_group_members', {
  uid: mediumint('gmb_uid').notNull(),
  gid: smallint('gmb_gid').notNull(),
  role: tinyint('gmb_moderator').default(0).notNull(),
  createdAt: int('gmb_dateline').default(0).notNull(),
});

export const chiiGroupTopics = mysqlTable('chii_group_topics', {
  id: mediumint('grp_tpc_id').autoincrement().notNull(),
  gid: mediumint('grp_tpc_gid').notNull(),
  uid: mediumint('grp_tpc_uid').notNull(),
  title: htmlEscapedString('varchar')('grp_tpc_title', { length: 80 }).notNull(),
  createdAt: int('grp_tpc_dateline').default(0).notNull(),
  updatedAt: int('grp_tpc_lastpost').default(0).notNull(),
  replies: mediumint('grp_tpc_replies').notNull(),
  state: tinyint('grp_tpc_state').notNull(),
  display: tinyint('grp_tpc_display').default(1).notNull(),
});

export const chiiGroupPosts = mysqlTable('chii_group_posts', {
  id: mediumint('grp_pst_id').autoincrement().notNull(),
  mid: mediumint('grp_pst_mid').notNull(),
  uid: mediumint('grp_pst_uid').notNull(),
  related: mediumint('grp_pst_related').notNull(),
  content: htmlEscapedString('mediumtext')('grp_pst_content').notNull(),
  state: tinyint('grp_pst_state').notNull(),
  createdAt: int('grp_pst_dateline').default(0).notNull(),
});

export const chiiIndexes = mysqlTable('chii_index', {
  id: mediumint('idx_id').autoincrement().notNull(),
  type: tinyint('idx_type').default(0).notNull(),
  title: htmlEscapedString('varchar')('idx_title', { length: 80 }).notNull(),
  desc: htmlEscapedString('mediumtext')('idx_desc').notNull(),
  replies: mediumint('idx_replies').notNull(),
  total: mediumint('idx_subject_total').notNull(),
  collects: mediumint('idx_collects').notNull(),
  stats: mediumtext('idx_stats').notNull(),
  award: mediumint('idx_award').default(0).notNull(),
  createdAt: int('idx_dateline').notNull(),
  updatedAt: int('idx_lasttouch').notNull(),
  uid: mediumint('idx_uid').notNull(),
  ban: tinyint('idx_ban').default(0).notNull(),
});

export const chiiIndexCollects = mysqlTable('chii_index_collects', {
  id: mediumint('idx_clt_id').autoincrement().notNull(),
  mid: mediumint('idx_clt_mid').notNull(),
  uid: mediumint('idx_clt_uid').notNull(),
  createdAt: int('idx_clt_dateline').notNull(),
});

export const chiiIndexComments = mysqlTable('chii_index_comments', {
  id: mediumint('idx_pst_id').autoincrement().notNull(),
  mid: mediumint('idx_pst_mid').notNull(),
  uid: mediumint('idx_pst_uid').notNull(),
  related: mediumint('idx_pst_related').notNull(),
  createdAt: int('idx_pst_dateline').notNull(),
  content: htmlEscapedString('mediumtext')('idx_pst_content').notNull(),
});

export const chiiIndexRelated = mysqlTable('chii_index_related', {
  id: mediumint('idx_rlt_id').autoincrement().notNull(),
  cat: tinyint('idx_rlt_cat').notNull(),
  rid: mediumint('idx_rlt_rid').notNull(),
  type: smallint('idx_rlt_type').notNull(),
  sid: mediumint('idx_rlt_sid').notNull(),
  order: mediumint('idx_rlt_order').notNull(),
  award: varchar('idx_rlt_award', { length: 255 }).notNull(),
  comment: htmlEscapedString('mediumtext')('idx_rlt_comment').notNull(),
  createdAt: int('idx_rlt_dateline').notNull(),
  ban: tinyint('idx_rlt_ban').default(0).notNull(),
});

export const chiiLikes = mysqlTable('chii_likes', {
  type: mediumint('type').notNull(),
  mainID: int('main_id').default(0).notNull(),
  relatedID: int('related_id').notNull(),
  uid: mediumint('uid').notNull(),
  value: mediumint('value').default(0).notNull(),
  deleted: customBoolean('ban').default(false).notNull(),
  createdAt: int('created_at').notNull(),
});

export const chiiUsers = mysqlTable('chii_members', {
  id: mediumint('uid').autoincrement().notNull(),
  username: char('username', { length: 15 }).default('').notNull(),
  nickname: htmlEscapedString('varchar')('nickname', { length: 30 }).notNull(),
  avatar: varchar('avatar', { length: 255 }).notNull(),
  groupid: smallint('groupid').notNull(),
  regdate: int('regdate').default(0).notNull(),
  lastvisit: int('lastvisit').default(0).notNull(),
  lastactivity: int('lastactivity').default(0).notNull(),
  lastpost: int('lastpost').default(0).notNull(),
  dateformat: char('dateformat', { length: 10 }).default('').notNull(),
  timeformat: tinyint('timeformat').default(0).notNull(),
  timeoffset: char('timeoffset', { length: 4 }).default('').notNull(),
  newpm: tinyint('newpm').default(0).notNull(),
  newNotify: smallint('new_notify').notNull(),
  sign: htmlEscapedString('varchar')('sign', { length: 255 }).notNull(),
  passwordCrypt: char('password_crypt', { length: 64 }).notNull(),
  email: char('email', { length: 50 }).default('').notNull(),
  acl: mediumtext('acl').notNull(),
});

export const chiiUserFields = mysqlTable('chii_memberfields', {
  uid: mediumint('uid').notNull(),
  site: varchar('site', { length: 75 }).default('').notNull(),
  location: varchar('location', { length: 30 }).default('').notNull(),
  bio: htmlEscapedString('text')('bio').notNull(),
  homepage: mediumtext('homepage').notNull(),
  privacy: mediumtext('privacy').notNull(),
  blocklist: mediumtext('blocklist').notNull(),
});

export const chiiUserNetworkServices = mysqlTable('chii_network_services', {
  uid: mediumint('ns_uid').notNull(),
  serviceID: tinyint('ns_service_id').notNull(),
  account: varchar('ns_account', { length: 255 }).notNull(),
  createdAt: int('ns_dateline').notNull(),
});

export const chiiNotify = mysqlTable('chii_notify', {
  id: mediumint('nt_id').autoincrement().notNull(),
  uid: mediumint('nt_uid').notNull(),
  fromUID: mediumint('nt_from_uid').notNull(),
  unread: customBoolean('nt_status').default(true).notNull(),
  type: tinyint('nt_type').default(0).notNull(),
  fieldID: mediumint('nt_mid').notNull(),
  related: int('nt_related_id').notNull(),
  createdAt: int('nt_dateline').notNull(),
});

export const chiiNotifyField = mysqlTable('chii_notify_field', {
  id: mediumint('ntf_id').autoincrement().notNull(),
  hash: tinyint('ntf_hash').default(0).notNull(),
  rid: int('ntf_rid').notNull(),
  title: htmlEscapedString('varchar')('ntf_title', { length: 255 }).notNull(),
});

export const chiiAccessToken = mysqlTable('chii_oauth_access_tokens', {
  id: mediumint('id').autoincrement().notNull(),
  type: tinyint('type').default(0).notNull(),
  accessToken: varchar('access_token', { length: 40 }).notNull(),
  clientID: varchar('client_id', { length: 80 }).notNull(),
  userID: varchar('user_id', { length: 80 }).notNull(),
  expiredAt: timestamp('expires', { mode: 'date' }).default(sql.raw('CURRENT_TIMESTAMP')).notNull(),
  scope: varchar('scope', { length: 4000 }),
  info: varchar('info', { length: 255 }).notNull(),
});

export const chiiOAuthRefreshToken = mysqlTable('chii_oauth_refresh_tokens', {
  refreshToken: varchar('refresh_token', { length: 40 }).notNull(),
  clientID: varchar('client_id', { length: 80 }).notNull(),
  userID: varchar('user_id', { length: 80 }).notNull(),
  expiredAt: timestamp('expires', { mode: 'date' }).default(sql.raw('CURRENT_TIMESTAMP')).notNull(),
  scope: varchar('scope', { length: 4000 }),
});

export const chiiOauthClients = mysqlTable('chii_oauth_clients', {
  appID: mediumint('app_id').notNull(),
  clientID: varchar('client_id', { length: 80 }).notNull(),
  clientSecret: varchar('client_secret', { length: 80 }),
  redirectUri: varchar('redirect_uri', { length: 2000 }),
  grantTypes: varchar('grant_types', { length: 80 }),
  scope: varchar('scope', { length: 4000 }),
  userId: varchar('user_id', { length: 80 }),
});

export const chiiOsWebSessions = mysqlTable('chii_os_web_sessions', {
  key: char('key', { length: 64 }).notNull(),
  userID: int('user_id').notNull(),
  value: mediumblob('value').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiredAt: bigint('expired_at', { mode: 'number' }).notNull(),
});

export type IChiiOsWebSessions = typeof chiiOsWebSessions.$inferSelect;

export const chiiPersons = mysqlTable('chii_persons', {
  id: mediumint('prsn_id').autoincrement().notNull(),
  name: htmlEscapedString('varchar')('prsn_name', { length: 255 }).notNull(),
  type: tinyint('prsn_type').notNull(),
  infobox: htmlEscapedString('mediumtext')('prsn_infobox').notNull(),
  producer: tinyint('prsn_producer').notNull(),
  mangaka: tinyint('prsn_mangaka').notNull(),
  artist: tinyint('prsn_artist').notNull(),
  seiyu: tinyint('prsn_seiyu').notNull(),
  writer: tinyint('prsn_writer').default(0).notNull(),
  illustrator: tinyint('prsn_illustrator').default(0).notNull(),
  actor: tinyint('prsn_actor').notNull(),
  summary: htmlEscapedString('mediumtext')('prsn_summary').notNull(),
  img: varchar('prsn_img', { length: 255 }).notNull(),
  comment: mediumint('prsn_comment').notNull(),
  collects: mediumint('prsn_collects').notNull(),
  createdAt: int('prsn_dateline').notNull(),
  updatedAt: int('prsn_lastpost').notNull(),
  lock: tinyint('prsn_lock').notNull(),
  anidbId: mediumint('prsn_anidb_id').notNull(),
  anidbImg: varchar('prsn_img_anidb', { length: 255 }).notNull(),
  ban: tinyint('prsn_ban').default(0).notNull(),
  redirect: int('prsn_redirect').default(0).notNull(),
  nsfw: customBoolean('prsn_nsfw').notNull(),
});

export const chiiPersonAlias = mysqlTable('chii_person_alias', {
  prsnCat: mysqlEnum('prsn_cat', ['prsn', 'crt']).notNull(),
  prsnId: mediumint('prsn_id').notNull(),
  aliasName: varchar('alias_name', { length: 255 }).notNull(),
  aliasType: tinyint('alias_type').notNull(),
  aliasKey: varchar('alias_key', { length: 10 }).notNull(),
});

export const chiiPersonCollects = mysqlTable('chii_person_collects', {
  id: mediumint('prsn_clt_id').autoincrement().notNull(),
  cat: mysqlEnum('prsn_clt_cat', ['prsn', 'crt']).notNull(),
  mid: mediumint('prsn_clt_mid').notNull(),
  uid: mediumint('prsn_clt_uid').notNull(),
  createdAt: int('prsn_clt_dateline').notNull(),
});

export const chiiPersonSubjects = mysqlTable('chii_person_cs_index', {
  personType: mysqlEnum('prsn_type', ['prsn', 'crt']).notNull(),
  personID: mediumint('prsn_id').notNull(),
  position: smallint('prsn_position').notNull(),
  subjectID: mediumint('subject_id').notNull(),
  subjectType: tinyint('subject_type_id').notNull(),
  summary: htmlEscapedString('mediumtext')('summary').notNull(),
  appearEps: htmlEscapedString('mediumtext')('prsn_appear_eps').notNull(),
});

export const chiiPersonFields = mysqlTable('chii_person_fields', {
  prsnCat: mysqlEnum('prsn_cat', ['prsn', 'crt']).notNull(),
  prsnId: int('prsn_id').notNull(),
  gender: tinyint('gender').notNull(),
  bloodtype: tinyint('bloodtype').notNull(),
  birthMon: tinyint('birth_mon').notNull(),
  birthDay: tinyint('birth_day').notNull(),
});

export const chiiPersonRelations = mysqlTable('chii_person_relationship', {
  type: mysqlEnum('prsn_type', ['prsn', 'crt']).notNull(),
  id: mediumint('prsn_id').notNull(),
  relatedType: mysqlEnum('relat_prsn_type', ['prsn', 'crt']).notNull(),
  relatedID: mediumint('relat_prsn_id').notNull(),
  relation: smallint('relat_type').notNull(),
});

export const chiiPms = mysqlTable('chii_pms', {
  msgId: int('msg_id').autoincrement().notNull(),
  msgSid: mediumint('msg_sid').notNull(),
  msgRid: mediumint('msg_rid').notNull(),
  msgFolder: mysqlEnum('msg_folder', ['inbox', 'outbox']).default('inbox').notNull(),
  msgNew: tinyint('msg_new').default(0).notNull(),
  msgTitle: htmlEscapedString('varchar')('msg_title', { length: 75 }).notNull(),
  msgDateline: int('msg_dateline').default(0).notNull(),
  msgMessage: htmlEscapedString('text')('msg_message').notNull(),
  msgRelatedMain: int('msg_related_main').default(0).notNull(),
  msgRelated: int('msg_related').notNull(),
  msgSdeleted: tinyint('msg_sdeleted').default(0).notNull(),
  msgRdeleted: tinyint('msg_rdeleted').default(0).notNull(),
});

export const chiiPrsnComments = mysqlTable('chii_prsn_comments', {
  id: mediumint('prsn_pst_id').autoincrement().notNull(),
  mid: mediumint('prsn_pst_mid').notNull(),
  uid: mediumint('prsn_pst_uid').notNull(),
  related: mediumint('prsn_pst_related').notNull(),
  createdAt: int('prsn_pst_dateline').notNull(),
  content: htmlEscapedString('mediumtext')('prsn_pst_content').notNull(),
  state: tinyint('prsn_pst_state').notNull(),
});

export const chiiRevHistory = mysqlTable('chii_rev_history', {
  revId: mediumint('rev_id').autoincrement().notNull(),
  revType: tinyint('rev_type').notNull(),
  revMid: mediumint('rev_mid').notNull(),
  revTextId: mediumint('rev_text_id').notNull(),
  createdAt: int('rev_dateline').notNull(),
  revCreator: mediumint('rev_creator').notNull(),
  revEditSummary: htmlEscapedString('varchar')('rev_edit_summary', { length: 200 }).notNull(),
});

export const chiiRevText = mysqlTable('chii_rev_text', {
  revTextId: mediumint('rev_text_id').autoincrement().notNull(),
  revText: mediumblob('rev_text').notNull(),
});

export const chiiSubjects = mysqlTable('chii_subjects', {
  id: mediumint('subject_id').autoincrement().notNull(),
  typeID: smallint('subject_type_id').notNull(),
  name: htmlEscapedString('varchar')('subject_name', { length: 80 }).notNull(),
  nameCN: htmlEscapedString('varchar')('subject_name_cn', { length: 80 }).notNull(),
  Uid: varchar('subject_uid', { length: 20 }).notNull(),
  creatorID: mediumint('subject_creator').notNull(),
  createdAt: int('subject_dateline').default(0).notNull(),
  image: varchar('subject_image', { length: 255 }).notNull(),
  platform: smallint('subject_platform').notNull(),
  metaTags: mediumtext('field_meta_tags').notNull(),
  infobox: htmlEscapedString('mediumtext')('field_infobox').notNull(),
  summary: mediumtext('field_summary').notNull(),
  field5: mediumtext('field_5').notNull(),
  volumes: mediumint('field_volumes').notNull(),
  eps: mediumint('field_eps').notNull(),
  wish: mediumint('subject_wish').notNull(),
  collect: mediumint('subject_collect').notNull(),
  doing: mediumint('subject_doing').notNull(),
  onHold: mediumint('subject_on_hold').notNull(),
  dropped: mediumint('subject_dropped').notNull(),
  series: customBoolean('subject_series').notNull(),
  seriesEntry: mediumint('subject_series_entry').notNull(),
  idxCN: varchar('subject_idx_cn', { length: 1 }).notNull(),
  airtime: tinyint('subject_airtime').notNull(),
  nsfw: customBoolean('subject_nsfw').notNull(),
  ban: tinyint('subject_ban').default(0).notNull(),
});

export const chiiSubjectFields = mysqlTable('chii_subject_fields', {
  id: mediumint('field_sid').autoincrement().notNull(),
  tid: smallint('field_tid').notNull(),
  tags: mediumtext('field_tags').notNull(),
  rate1: mediumint('field_rate_1').notNull(),
  rate2: mediumint('field_rate_2').notNull(),
  rate3: mediumint('field_rate_3').notNull(),
  rate4: mediumint('field_rate_4').notNull(),
  rate5: mediumint('field_rate_5').notNull(),
  rate6: mediumint('field_rate_6').notNull(),
  rate7: mediumint('field_rate_7').notNull(),
  rate8: mediumint('field_rate_8').notNull(),
  rate9: mediumint('field_rate_9').notNull(),
  rate10: mediumint('field_rate_10').notNull(),
  airtime: tinyint('field_airtime').notNull(),
  rank: int('field_rank').default(0).notNull(),
  year: year('field_year').notNull(),
  month: tinyint('field_mon').notNull(),
  weekday: tinyint('field_week_day').notNull(),
  date: date('field_date', { mode: 'string' }).notNull(),
  redirect: mediumint('field_redirect').notNull(),
});

export const chiiSubjectAlias = mysqlTable('chii_subject_alias', {
  subjectId: int('subject_id').notNull(),
  aliasName: varchar('alias_name', { length: 255 }).notNull(),
  subjectTypeId: tinyint('subject_type_id').default(0).notNull(),
  aliasType: tinyint('alias_type').default(0).notNull(),
  aliasKey: varchar('alias_key', { length: 10 }).notNull(),
});

export const chiiSubjectImgs = mysqlTable('chii_subject_imgs', {
  imgId: mediumint('img_id').autoincrement().notNull(),
  imgSubjectId: mediumint('img_subject_id').notNull(),
  imgUid: mediumint('img_uid').notNull(),
  imgTarget: varchar('img_target', { length: 255 }).notNull(),
  imgVote: mediumint('img_vote').notNull(),
  imgNsfw: customBoolean('img_nsfw').notNull(),
  imgBan: tinyint('img_ban').notNull(),
  imgDateline: int('img_dateline').notNull(),
});

export const chiiSubjectInterests = mysqlTable('chii_subject_interests', {
  id: int('interest_id').autoincrement().notNull().primaryKey(),
  uid: mediumint('interest_uid').notNull(),
  subjectID: mediumint('interest_subject_id').notNull(),
  subjectType: smallint('interest_subject_type').notNull(),
  rate: tinyint('interest_rate').default(0).notNull(),
  type: tinyint('interest_type').default(0).notNull(),
  hasComment: tinyint('interest_has_comment').notNull(),
  comment: htmlEscapedString('mediumtext')('interest_comment').notNull(),
  tag: mediumtext('interest_tag').notNull(),
  epStatus: mediumint('interest_ep_status').notNull(),
  volStatus: mediumint('interest_vol_status').notNull(),
  wishDateline: int('interest_wish_dateline').notNull(),
  doingDateline: int('interest_doing_dateline').notNull(),
  collectDateline: int('interest_collect_dateline').notNull(),
  onHoldDateline: int('interest_on_hold_dateline').notNull(),
  droppedDateline: int('interest_dropped_dateline').notNull(),
  createIp: char('interest_create_ip', { length: 15 }).notNull(),
  updateIp: char('interest_lasttouch_ip', { length: 15 }).notNull(),
  updatedAt: int('interest_lasttouch').default(0).notNull(),
  privacy: tinyint('interest_private').notNull(),
});

export const chiiSubjectRelatedBlogs = mysqlTable('chii_subject_related_blog', {
  id: mediumint('srb_id').autoincrement().notNull(),
  uid: mediumint('srb_uid').notNull(),
  subjectID: mediumint('srb_subject_id').notNull(),
  entryID: mediumint('srb_entry_id').notNull(),
  spoiler: mediumint('srb_spoiler').notNull(),
  like: mediumint('srb_like').notNull(),
  dislike: mediumint('srb_dislike').notNull(),
  createdAt: int('srb_dateline').notNull(),
});

export const chiiSubjectRec = mysqlTable('chii_subject_rec', {
  subjectID: mediumint('subject_id').notNull(),
  recSubjectID: mediumint('rec_subject_id').notNull(),
  sim: float('mio_sim').notNull(),
  count: mediumint('mio_count').notNull(),
});

export const chiiSubjectRelations = mysqlTable('chii_subject_relations', {
  id: mediumint('rlt_subject_id').notNull(),
  type: tinyint('rlt_subject_type_id').notNull(),
  relation: smallint('rlt_relation_type').notNull(),
  relatedID: mediumint('rlt_related_subject_id').notNull(),
  relatedType: tinyint('rlt_related_subject_type_id').notNull(),
  viceVersa: tinyint('rlt_vice_versa').notNull(),
  order: tinyint('rlt_order').notNull(),
});

export const chiiSubjectRev = mysqlTable('chii_subject_revisions', {
  revId: mediumint('rev_id').autoincrement().notNull(),
  type: tinyint('rev_type').default(1).notNull(),
  subjectID: mediumint('rev_subject_id').notNull(),
  typeID: smallint('rev_type_id').notNull(),
  creatorID: mediumint('rev_creator').notNull(),
  createdAt: int('rev_dateline').default(0).notNull(),
  name: htmlEscapedString('varchar')('rev_name', { length: 80 }).notNull(),
  nameCN: htmlEscapedString('varchar')('rev_name_cn', { length: 80 }).notNull(),
  infobox: mediumtext('rev_field_infobox').notNull(),
  metaTags: mediumtext('rev_field_meta_tags').notNull(),
  summary: mediumtext('rev_field_summary').notNull(),
  revVoteField: mediumtext('rev_vote_field').default('').notNull(),
  eps: mediumint('rev_field_eps').default(0).notNull(),
  commitMessage: htmlEscapedString('varchar')('rev_edit_summary', { length: 200 }).notNull(),
  platform: smallint('rev_platform').notNull(),
});

export const chiiSubjectTopics = mysqlTable('chii_subject_topics', {
  id: mediumint('sbj_tpc_id').autoincrement().notNull(),
  subjectID: mediumint('sbj_tpc_subject_id').notNull(),
  uid: mediumint('sbj_tpc_uid').notNull(),
  title: htmlEscapedString('varchar')('sbj_tpc_title', { length: 80 }).notNull(),
  createdAt: int('sbj_tpc_dateline').default(0).notNull(),
  updatedAt: int('sbj_tpc_lastpost').default(0).notNull(),
  replies: mediumint('sbj_tpc_replies').notNull(),
  state: tinyint('sbj_tpc_state').notNull(),
  display: tinyint('sbj_tpc_display').default(1).notNull(),
});

export const chiiSubjectPosts = mysqlTable('chii_subject_posts', {
  id: mediumint('sbj_pst_id').primaryKey().autoincrement().notNull(),
  mid: mediumint('sbj_pst_mid').notNull(),
  uid: mediumint('sbj_pst_uid').notNull(),
  related: mediumint('sbj_pst_related').notNull(),
  content: htmlEscapedString('mediumtext')('sbj_pst_content').notNull(),
  state: tinyint('sbj_pst_state').notNull(),
  createdAt: int('sbj_pst_dateline').default(0).notNull(),
});

export const chiiTagIndex = mysqlTable('chii_tag_neue_index', {
  id: mediumint('tag_id').autoincrement().notNull().primaryKey(),
  name: varchar('tag_name', { length: 30 }).notNull(),
  cat: tinyint('tag_cat').notNull(),
  type: tinyint('tag_type').notNull(),
  count: mediumint('tag_results').notNull(),
  createdAt: int('tag_dateline').notNull(),
  updatedAt: int('tag_lasttouch').notNull(),
});

export const chiiTagList = mysqlTable('chii_tag_neue_list', {
  tagID: mediumint('tlt_tid').notNull(),
  userID: mediumint('tlt_uid').notNull(),
  cat: tinyint('tlt_cat').notNull(),
  type: tinyint('tlt_type').notNull(),
  mainID: mediumint('tlt_mid').notNull(),
  createdAt: int('tlt_dateline').notNull(),
});

export const chiiTagFields = mysqlTable('chii_tag_neue_fields', {
  tagID: int('field_tid').notNull(),
  summary: htmlEscapedString('mediumtext')('field_summary').notNull(),
  order: mediumint('field_order').notNull(),
  nsfw: customBoolean('field_nsfw').notNull(),
  lock: int('field_lock').default(0).notNull(),
});

export const chiiTimeline = mysqlTable('chii_timeline', {
  id: int('tml_id').autoincrement().notNull(),
  uid: mediumint('tml_uid').notNull(),
  cat: smallint('tml_cat').notNull(),
  type: smallint('tml_type').notNull(),
  related: char('tml_related', { length: 255 }).default('0').notNull(),
  memo: mediumtext('tml_memo').notNull(),
  img: mediumtext('tml_img').notNull(),
  batch: customBoolean('tml_batch').notNull(),
  source: tinyint('tml_source').default(0).notNull(),
  replies: mediumint('tml_replies').notNull(),
  createdAt: int('tml_dateline').default(0).notNull(),
});

export const chiiTimelineComments = mysqlTable('chii_timeline_comments', {
  id: mediumint('tml_pst_id').autoincrement().notNull(),
  mid: int('tml_pst_mid').notNull(),
  uid: mediumint('tml_pst_uid').notNull(),
  related: mediumint('tml_pst_related').notNull(),
  createdAt: int('tml_pst_dateline').notNull(),
  content: htmlEscapedString('mediumtext')('tml_pst_content').notNull(),
});

export const chiiUsergroup = mysqlTable('chii_usergroup', {
  id: mediumint('usr_grp_id').autoincrement().notNull(),
  name: varchar('usr_grp_name', { length: 255 }).notNull(),
  perm: mediumtext('usr_grp_perm').notNull(),
  createdAt: int('usr_grp_dateline').notNull(),
});

export const chiiBlogComments = mysqlTable('chii_blog_comments', {
  id: mediumint('blg_pst_id').autoincrement().notNull(),
  mid: mediumint('blg_pst_mid').notNull(),
  uid: mediumint('blg_pst_uid').notNull(),
  related: mediumint('blg_pst_related').notNull(),
  createdAt: int('blg_pst_dateline').notNull(),
  content: htmlEscapedString('mediumtext')('blg_pst_content').notNull(),
});

export const chiiBlogEntries = mysqlTable('chii_blog_entry', {
  id: mediumint('entry_id').autoincrement().notNull(),
  type: smallint('entry_type').notNull(),
  uid: mediumint('entry_uid').notNull(),
  title: htmlEscapedString('varchar')('entry_title', { length: 80 }).notNull(),
  icon: varchar('entry_icon', { length: 255 }).notNull(),
  content: htmlEscapedString('mediumtext')('entry_content').notNull(),
  tags: mediumtext('entry_tags').notNull(),
  views: mediumint('entry_views').notNull(),
  replies: mediumint('entry_replies').notNull(),
  createdAt: int('entry_dateline').notNull(),
  updatedAt: int('entry_lastpost').notNull(),
  like: int('entry_like').notNull(),
  dislike: int('entry_dislike').notNull(),
  noreply: smallint('entry_noreply').notNull(),
  related: tinyint('entry_related').default(0).notNull(),
  public: customBoolean('entry_public').default(true).notNull(),
});

export const chiiBlogPhotos = mysqlTable('chii_blog_photo', {
  id: mediumint('photo_id').autoincrement().notNull(),
  eid: mediumint('photo_eid').notNull(),
  uid: mediumint('photo_uid').notNull(),
  target: varchar('photo_target', { length: 255 }).notNull(),
  vote: mediumint('photo_vote').notNull(),
  createdAt: int('photo_dateline').notNull(),
});
