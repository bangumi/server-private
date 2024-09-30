import {
  bigint,
  char,
  customType,
  date,
  float,
  index,
  int,
  mediumint,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
  year,
} from 'drizzle-orm/mysql-core';

export const chiiApps = mysqlTable(
  'chii_apps',
  {
    appId: mediumint('app_id').autoincrement().notNull(),
    appType: tinyint('app_type').notNull(),
    appCreator: mediumint('app_creator').notNull(),
    appName: varchar('app_name', { length: 255 }).notNull(),
    appDesc: mediumtext('app_desc').notNull(),
    appUrl: varchar('app_url', { length: 2000 }).notNull(),
    appCollects: mediumint('app_collects').notNull(),
    appStatus: tinyint('app_status').notNull(),
    appTimestamp: int('app_timestamp').notNull(),
    appLasttouch: int('app_lasttouch').notNull(),
    appBan: tinyint('app_ban').notNull(),
  },
  (table) => {
    return {
      appType: index('app_type').on(table.appType, table.appCreator),
      appBan: index('app_ban').on(table.appBan),
      appStatus: index('app_status').on(table.appStatus),
    };
  },
);

export const chiiCharacters = mysqlTable(
  'chii_characters',
  {
    crtId: mediumint('crt_id').autoincrement().notNull(),
    crtName: varchar('crt_name', { length: 255 }).notNull(),
    crtRole: tinyint('crt_role').notNull(),
    crtInfobox: mediumtext('crt_infobox').notNull(),
    crtSummary: mediumtext('crt_summary').notNull(),
    crtImg: varchar('crt_img', { length: 255 }).notNull(),
    crtComment: mediumint('crt_comment').notNull(),
    crtCollects: mediumint('crt_collects').notNull(),
    crtDateline: int('crt_dateline').notNull(),
    crtLastpost: int('crt_lastpost').notNull(),
    crtLock: tinyint('crt_lock').default(0).notNull(),
    crtImgAnidb: varchar('crt_img_anidb', { length: 255 }).notNull(),
    crtAnidbId: mediumint('crt_anidb_id').notNull(),
    crtBan: tinyint('crt_ban').default(0).notNull(),
    crtRedirect: int('crt_redirect').default(0).notNull(),
    crtNsfw: tinyint('crt_nsfw').notNull(),
  },
  (table) => {
    return {
      crtRole: index('crt_role').on(table.crtRole),
      crtLock: index('crt_lock').on(table.crtLock),
      crtBan: index('crt_ban').on(table.crtBan),
    };
  },
);

export const chiiCrtCastIndex = mysqlTable(
  'chii_crt_cast_index',
  {
    crtId: mediumint('crt_id').notNull(),
    prsnId: mediumint('prsn_id').notNull(),
    subjectId: mediumint('subject_id').notNull(),
    subjectTypeId: tinyint('subject_type_id').notNull(),
    summary: varchar('summary', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      prsnId: index('prsn_id').on(table.prsnId),
      subjectId: index('subject_id').on(table.subjectId),
      subjectTypeId: index('subject_type_id').on(table.subjectTypeId),
    };
  },
);

export const chiiCrtComments = mysqlTable(
  'chii_crt_comments',
  {
    crtPstId: mediumint('crt_pst_id').autoincrement().notNull(),
    crtPstMid: mediumint('crt_pst_mid').notNull(),
    crtPstUid: mediumint('crt_pst_uid').notNull(),
    crtPstRelated: mediumint('crt_pst_related').notNull(),
    crtPstDateline: int('crt_pst_dateline').notNull(),
    crtPstContent: mediumtext('crt_pst_content').notNull(),
  },
  (table) => {
    return {
      cmtCrtId: index('cmt_crt_id').on(table.crtPstMid),
      crtPstRelated: index('crt_pst_related').on(table.crtPstRelated),
      crtPstUid: index('crt_pst_uid').on(table.crtPstUid),
    };
  },
);

export const chiiCrtSubjectIndex = mysqlTable(
  'chii_crt_subject_index',
  {
    crtId: mediumint('crt_id').notNull(),
    subjectId: mediumint('subject_id').notNull(),
    subjectTypeId: tinyint('subject_type_id').notNull(),
    crtType: tinyint('crt_type').notNull(),
    ctrAppearEps: mediumtext('ctr_appear_eps').notNull(),
    crtOrder: smallint('crt_order').notNull(),
  },
  (table) => {
    return {
      subjectId: index('subject_id').on(table.subjectId),
      crtType: index('crt_type').on(table.crtType),
      subjectTypeId: index('subject_type_id').on(table.subjectTypeId),
    };
  },
);

export const chiiEpisodes = mysqlTable(
  'chii_episodes',
  {
    epId: mediumint('ep_id').autoincrement().notNull(),
    epSubjectId: mediumint('ep_subject_id').notNull(),
    // Warning: Can't parse float unsigned from database
    epSort: float('ep_sort').notNull(),
    epType: tinyint('ep_type').notNull(),
    epDisc: tinyint('ep_disc').default(0).notNull(),
    epName: varchar('ep_name', { length: 80 }).notNull(),
    epNameCn: varchar('ep_name_cn', { length: 80 }).notNull(),
    epRate: tinyint('ep_rate').notNull(),
    epDuration: varchar('ep_duration', { length: 80 }).notNull(),
    epAirdate: varchar('ep_airdate', { length: 80 }).notNull(),
    epOnline: mediumtext('ep_online').notNull(),
    epComment: mediumint('ep_comment').notNull(),
    epResources: mediumint('ep_resources').notNull(),
    epDesc: mediumtext('ep_desc').notNull(),
    epDateline: int('ep_dateline').notNull(),
    epLastpost: int('ep_lastpost').notNull(),
    epLock: tinyint('ep_lock').default(0).notNull(),
    epBan: tinyint('ep_ban').default(0).notNull(),
  },
  (table) => {
    return {
      epSort: index('ep_sort').on(table.epSort),
      epDisc: index('ep_disc').on(table.epDisc),
      epSubjectId: index('ep_subject_id').on(table.epSubjectId),
      epLastpost: index('ep_lastpost').on(table.epLastpost),
      epBan: index('ep_ban').on(table.epBan),
      epSubjectId2: index('ep_subject_id_2').on(table.epSubjectId, table.epBan, table.epSort),
    };
  },
);

export const chiiEpComments = mysqlTable(
  'chii_ep_comments',
  {
    epPstId: mediumint('ep_pst_id').autoincrement().notNull(),
    epPstMid: mediumint('ep_pst_mid').notNull(),
    epPstUid: mediumint('ep_pst_uid').notNull(),
    epPstRelated: mediumint('ep_pst_related').notNull(),
    epPstDateline: int('ep_pst_dateline').notNull(),
    epPstContent: mediumtext('ep_pst_content').notNull(),
    epPstState: tinyint('ep_pst_state').notNull(),
  },
  (table) => {
    return {
      epCmtCrtId: index('ep_cmt_crt_id').on(table.epPstMid),
      epPstRelated: index('ep_pst_related').on(table.epPstRelated),
      epPstUid: index('ep_pst_uid').on(table.epPstUid),
    };
  },
);

export const chiiEpRevisions = mysqlTable(
  'chii_ep_revisions',
  {
    epRevId: mediumint('ep_rev_id').autoincrement().notNull(),
    revSid: mediumint('rev_sid').notNull(),
    revEids: varchar('rev_eids', { length: 255 }).notNull(),
    revEpInfobox: mediumtext('rev_ep_infobox').notNull(),
    revCreator: mediumint('rev_creator').notNull(),
    revVersion: tinyint('rev_version').default(0).notNull(),
    revDateline: int('rev_dateline').notNull(),
    revEditSummary: varchar('rev_edit_summary', { length: 200 }).notNull(),
  },
  (table) => {
    return {
      revSid: index('rev_sid').on(table.revSid, table.revCreator),
    };
  },
);

export const chiiEpStatus = mysqlTable(
  'chii_ep_status',
  {
    epSttId: mediumint('ep_stt_id').autoincrement().notNull(),
    epSttUid: mediumint('ep_stt_uid').notNull(),
    epSttSid: mediumint('ep_stt_sid').notNull(),
    epSttOnPrg: tinyint('ep_stt_on_prg').default(0).notNull(),
    epSttStatus: mediumtext('ep_stt_status').notNull(),
    epSttLasttouch: int('ep_stt_lasttouch').notNull(),
  },
  (table) => {
    return {
      epSttUniq: unique('ep_stt_uniq').on(table.epSttUid, table.epSttSid),
    };
  },
);

export const chiiFriends = mysqlTable(
  'chii_friends',
  {
    frdUid: mediumint('frd_uid').notNull(),
    frdFid: mediumint('frd_fid').notNull(),
    frdGrade: tinyint('frd_grade').default(1).notNull(),
    frdDateline: int('frd_dateline').default(0).notNull(),
    frdDescription: char('frd_description', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      uid: index('uid').on(table.frdUid),
      frdFid: index('frd_fid').on(table.frdFid),
    };
  },
);

export const chiiGroups = mysqlTable('chii_groups', {
  grpId: smallint('grp_id').autoincrement().notNull(),
  grpCat: smallint('grp_cat').notNull(),
  grpName: char('grp_name', { length: 50 }).notNull(),
  grpTitle: char('grp_title', { length: 50 }).notNull(),
  grpIcon: varchar('grp_icon', { length: 255 }).notNull(),
  grpCreator: mediumint('grp_creator').notNull(),
  grpTopics: mediumint('grp_topics').notNull(),
  grpPosts: mediumint('grp_posts').notNull(),
  grpMembers: mediumint('grp_members').default(1).notNull(),
  grpDesc: text('grp_desc').notNull(),
  grpLastpost: int('grp_lastpost').notNull(),
  grpBuilddate: int('grp_builddate').notNull(),
  grpAccessible: tinyint('grp_accessible').default(1).notNull(),
  grpNsfw: tinyint('grp_nsfw').notNull(),
});

export const chiiGroupMembers = mysqlTable('chii_group_members', {
  gmbUid: mediumint('gmb_uid').notNull(),
  gmbGid: smallint('gmb_gid').notNull(),
  gmbModerator: tinyint('gmb_moderator').default(0).notNull(),
  gmbDateline: int('gmb_dateline').default(0).notNull(),
});

export const chiiGroupPosts = mysqlTable(
  'chii_group_posts',
  {
    grpPstId: mediumint('grp_pst_id').autoincrement().notNull(),
    grpPstMid: mediumint('grp_pst_mid').notNull(),
    grpPstUid: mediumint('grp_pst_uid').notNull(),
    grpPstRelated: mediumint('grp_pst_related').notNull(),
    grpPstContent: mediumtext('grp_pst_content').notNull(),
    grpPstState: tinyint('grp_pst_state').notNull(),
    grpPstDateline: int('grp_pst_dateline').default(0).notNull(),
  },
  (table) => {
    return {
      pssTopicId: index('pss_topic_id').on(table.grpPstMid),
      grpPstRelated: index('grp_pst_related').on(table.grpPstRelated),
      grpPstUid: index('grp_pst_uid').on(table.grpPstUid),
    };
  },
);

export const chiiGroupTopics = mysqlTable(
  'chii_group_topics',
  {
    grpTpcId: mediumint('grp_tpc_id').autoincrement().notNull(),
    grpTpcGid: mediumint('grp_tpc_gid').notNull(),
    grpTpcUid: mediumint('grp_tpc_uid').notNull(),
    grpTpcTitle: varchar('grp_tpc_title', { length: 80 }).notNull(),
    grpTpcDateline: int('grp_tpc_dateline').default(0).notNull(),
    grpTpcLastpost: int('grp_tpc_lastpost').default(0).notNull(),
    grpTpcReplies: mediumint('grp_tpc_replies').notNull(),
    grpTpcState: tinyint('grp_tpc_state').notNull(),
    grpTpcDisplay: tinyint('grp_tpc_display').default(1).notNull(),
  },
  (table) => {
    return {
      grpTpcGid: index('grp_tpc_gid').on(table.grpTpcGid),
      grpTpcDisplay: index('grp_tpc_display').on(table.grpTpcDisplay),
      grpTpcUid: index('grp_tpc_uid').on(table.grpTpcUid),
      grpTpcLastpost: index('grp_tpc_lastpost').on(table.grpTpcLastpost),
    };
  },
);

export const chiiIndex = mysqlTable(
  'chii_index',
  {
    idxId: mediumint('idx_id').autoincrement().notNull(),
    idxType: tinyint('idx_type').default(0).notNull(),
    idxTitle: varchar('idx_title', { length: 80 }).notNull(),
    idxDesc: mediumtext('idx_desc').notNull(),
    idxReplies: mediumint('idx_replies').notNull(),
    idxSubjectTotal: mediumint('idx_subject_total').notNull(),
    idxCollects: mediumint('idx_collects').notNull(),
    idxStats: mediumtext('idx_stats').notNull(),
    idxDateline: int('idx_dateline').notNull(),
    idxLasttouch: int('idx_lasttouch').notNull(),
    idxUid: mediumint('idx_uid').notNull(),
    idxBan: tinyint('idx_ban').default(0).notNull(),
  },
  (table) => {
    return {
      idxBan: index('idx_ban').on(table.idxBan),
      idxType: index('idx_type').on(table.idxType),
      idxUid: index('idx_uid').on(table.idxUid),
      idxCollects: index('idx_collects').on(table.idxCollects),
      mid: unique('mid').on(table.idxId),
    };
  },
);

export const chiiIndexCollects = mysqlTable(
  'chii_index_collects',
  {
    idxCltId: mediumint('idx_clt_id').autoincrement().notNull(),
    idxCltMid: mediumint('idx_clt_mid').notNull(),
    idxCltUid: mediumint('idx_clt_uid').notNull(),
    idxCltDateline: int('idx_clt_dateline').notNull(),
  },
  (table) => {
    return {
      idxCltMid: index('idx_clt_mid').on(table.idxCltMid, table.idxCltUid),
    };
  },
);

export const chiiIndexComments = mysqlTable(
  'chii_index_comments',
  {
    idxPstId: mediumint('idx_pst_id').autoincrement().notNull(),
    idxPstMid: mediumint('idx_pst_mid').notNull(),
    idxPstUid: mediumint('idx_pst_uid').notNull(),
    idxPstRelated: mediumint('idx_pst_related').notNull(),
    idxPstDateline: int('idx_pst_dateline').notNull(),
    idxPstContent: mediumtext('idx_pst_content').notNull(),
  },
  (table) => {
    return {
      idxPstMid: index('idx_pst_mid').on(table.idxPstMid),
      idxPstRelated: index('idx_pst_related').on(table.idxPstRelated),
      idxPstUid: index('idx_pst_uid').on(table.idxPstUid),
    };
  },
);

export const chiiIndexRelated = mysqlTable(
  'chii_index_related',
  {
    idxRltId: mediumint('idx_rlt_id').autoincrement().notNull(),
    idxRltCat: tinyint('idx_rlt_cat').notNull(),
    idxRltRid: mediumint('idx_rlt_rid').notNull(),
    idxRltType: smallint('idx_rlt_type').notNull(),
    idxRltSid: mediumint('idx_rlt_sid').notNull(),
    idxRltOrder: mediumint('idx_rlt_order').notNull(),
    idxRltComment: mediumtext('idx_rlt_comment').notNull(),
    idxRltDateline: int('idx_rlt_dateline').notNull(),
    idxRltBan: tinyint('idx_rlt_ban').default(0).notNull(),
  },
  (table) => {
    return {
      idxRltRid: index('idx_rlt_rid').on(table.idxRltRid, table.idxRltType),
      idxRltSid: index('idx_rlt_sid').on(table.idxRltRid, table.idxRltSid),
      idxRltSid2: index('idx_rlt_sid_2').on(table.idxRltSid),
      idxRltCat: index('idx_rlt_cat').on(table.idxRltCat),
      idxOrder: index('idx_order').on(
        table.idxRltRid,
        table.idxRltCat,
        table.idxRltOrder,
        table.idxRltSid,
      ),
      idxRltBan: index('idx_rlt_ban').on(table.idxRltBan),
    };
  },
);

export const chiiLikes = mysqlTable(
  'chii_likes',
  {
    type: mediumint('type').notNull(),
    mainID: int('main_id').default(0).notNull(),
    relatedID: int('related_id').notNull(),
    uid: mediumint('uid').notNull(),
    value: mediumint('value').default(0).notNull(),
    deleted: tinyint('ban').default(0).notNull(),
    createdAt: int('created_at').notNull(),
  },
  (table) => {
    return {
      idxUid: index('idx_uid').on(table.uid),
      idxRelated: index('idx_related').on(table.relatedID),
      type: index('type').on(table.type, table.mainID, table.uid),
    };
  },
);

export const chiiMemberfields = mysqlTable('chii_memberfields', {
  uid: mediumint('uid').notNull(),
  site: varchar('site', { length: 75 }).default('').notNull(),
  location: varchar('location', { length: 30 }).default('').notNull(),
  bio: text('bio').notNull(),
  privacy: mediumtext('privacy').notNull(),
  blocklist: mediumtext('blocklist').notNull(),
});

export const chiiMembers = mysqlTable(
  'chii_members',
  {
    uid: mediumint('uid').autoincrement().notNull(),
    username: char('username', { length: 15 }).default('').notNull(),
    nickname: varchar('nickname', { length: 30 }).notNull(),
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
    sign: varchar('sign', { length: 255 }).notNull(),
    passwordCrypt: char('password_crypt', { length: 64 }).notNull(),
    email: char('email', { length: 50 }).default('').notNull(),
    acl: mediumtext('acl').notNull(),
  },
  (table) => {
    return {
      username: unique('username').on(table.username),
    };
  },
);

export const chiiNotify = mysqlTable(
  'chii_notify',
  {
    ntId: mediumint('nt_id').autoincrement().notNull(),
    ntUid: mediumint('nt_uid').notNull(),
    ntFromUid: mediumint('nt_from_uid').notNull(),
    ntStatus: tinyint('nt_status').default(1).notNull(),
    ntType: tinyint('nt_type').default(0).notNull(),
    ntMid: mediumint('nt_mid').notNull(),
    ntRelatedId: int('nt_related_id').notNull(),
    ntDateline: int('nt_dateline').notNull(),
  },
  (table) => {
    return {
      ntFromUid: index('nt_from_uid').on(table.ntFromUid),
      ntMid: index('nt_mid').on(table.ntMid),
      ntUid: index('nt_uid').on(table.ntUid, table.ntStatus, table.ntType, table.ntRelatedId),
    };
  },
);

export const chiiNotifyField = mysqlTable(
  'chii_notify_field',
  {
    ntfId: mediumint('ntf_id').autoincrement().notNull(),
    ntfHash: tinyint('ntf_hash').default(0).notNull(),
    ntfRid: int('ntf_rid').notNull(),
    ntfTitle: varchar('ntf_title', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      ntfHash: index('ntf_hash').on(table.ntfHash),
      ntfRid: index('ntf_rid').on(table.ntfRid),
    };
  },
);

export const chiiOauthAccessTokens = mysqlTable(
  'chii_oauth_access_tokens',
  {
    id: mediumint('id').autoincrement().notNull(),
    type: tinyint('type').default(0).notNull(),
    accessToken: varchar('access_token', { length: 40 }).notNull(),
    clientID: varchar('client_id', { length: 80 }).notNull(),
    userID: varchar('user_id', { length: 80 }),
    expiredAt: timestamp('expires', { mode: 'date' })
      // .default('CURRENT_TIMESTAMP')
      // .onUpdateNow()
      .notNull(),
    scope: varchar('scope', { length: 4000 }),
    info: varchar('info', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      type: index('type').on(table.type),
      accessToken: unique('access_token').on(table.accessToken),
    };
  },
);

export const chiiOauthClients = mysqlTable(
  'chii_oauth_clients',
  {
    appId: mediumint('app_id').notNull(),
    clientId: varchar('client_id', { length: 80 }).notNull(),
    clientSecret: varchar('client_secret', { length: 80 }),
    redirectUri: varchar('redirect_uri', { length: 2000 }),
    grantTypes: varchar('grant_types', { length: 80 }),
    scope: varchar('scope', { length: 4000 }),
    userId: varchar('user_id', { length: 80 }),
  },
  (table) => {
    return {
      clientId: index('client_id').on(table.clientId),
    };
  },
);

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

export const chiiOsWebSessions = mysqlTable('chii_os_web_sessions', {
  key: char('key', { length: 64 }).notNull(),
  userID: int('user_id').notNull(),
  value: mediumblob('value').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiredAt: bigint('expired_at', { mode: 'number' }).notNull(),
});

export type IChiiOsWebSessions = typeof chiiOsWebSessions.$inferSelect;

export const chiiPersons = mysqlTable(
  'chii_persons',
  {
    prsnId: mediumint('prsn_id').autoincrement().notNull(),
    prsnName: varchar('prsn_name', { length: 255 }).notNull(),
    prsnType: tinyint('prsn_type').notNull(),
    prsnInfobox: mediumtext('prsn_infobox').notNull(),
    prsnProducer: tinyint('prsn_producer').notNull(),
    prsnMangaka: tinyint('prsn_mangaka').notNull(),
    prsnArtist: tinyint('prsn_artist').notNull(),
    prsnSeiyu: tinyint('prsn_seiyu').notNull(),
    prsnWriter: tinyint('prsn_writer').default(0).notNull(),
    prsnIllustrator: tinyint('prsn_illustrator').default(0).notNull(),
    prsnActor: tinyint('prsn_actor').notNull(),
    prsnSummary: mediumtext('prsn_summary').notNull(),
    prsnImg: varchar('prsn_img', { length: 255 }).notNull(),
    prsnImgAnidb: varchar('prsn_img_anidb', { length: 255 }).notNull(),
    prsnComment: mediumint('prsn_comment').notNull(),
    prsnCollects: mediumint('prsn_collects').notNull(),
    prsnDateline: int('prsn_dateline').notNull(),
    prsnLastpost: int('prsn_lastpost').notNull(),
    prsnLock: tinyint('prsn_lock').notNull(),
    prsnAnidbId: mediumint('prsn_anidb_id').notNull(),
    prsnBan: tinyint('prsn_ban').default(0).notNull(),
    prsnRedirect: int('prsn_redirect').default(0).notNull(),
    prsnNsfw: tinyint('prsn_nsfw').notNull(),
  },
  (table) => {
    return {
      prsnType: index('prsn_type').on(table.prsnType),
      prsnProducer: index('prsn_producer').on(table.prsnProducer),
      prsnMangaka: index('prsn_mangaka').on(table.prsnMangaka),
      prsnArtist: index('prsn_artist').on(table.prsnArtist),
      prsnSeiyu: index('prsn_seiyu').on(table.prsnSeiyu),
      prsnWriter: index('prsn_writer').on(table.prsnWriter),
      prsnIllustrator: index('prsn_illustrator').on(table.prsnIllustrator),
      prsnLock: index('prsn_lock').on(table.prsnLock),
      prsnBan: index('prsn_ban').on(table.prsnBan),
      prsnActor: index('prsn_actor').on(table.prsnActor),
    };
  },
);

export const chiiPersonAlias = mysqlTable(
  'chii_person_alias',
  {
    prsnCat: mysqlEnum('prsn_cat', ['prsn', 'crt']).notNull(),
    prsnId: mediumint('prsn_id').notNull(),
    aliasName: varchar('alias_name', { length: 255 }).notNull(),
    aliasType: tinyint('alias_type').notNull(),
    aliasKey: varchar('alias_key', { length: 10 }).notNull(),
  },
  (table) => {
    return {
      prsnCat: index('prsn_cat').on(table.prsnCat, table.prsnId),
      prsnId: index('prsn_id').on(table.prsnId),
    };
  },
);

export const chiiPersonCollects = mysqlTable(
  'chii_person_collects',
  {
    prsnCltId: mediumint('prsn_clt_id').autoincrement().notNull(),
    prsnCltCat: mysqlEnum('prsn_clt_cat', ['prsn', 'crt']).notNull(),
    prsnCltMid: mediumint('prsn_clt_mid').notNull(),
    prsnCltUid: mediumint('prsn_clt_uid').notNull(),
    prsnCltDateline: int('prsn_clt_dateline').notNull(),
  },
  (table) => {
    return {
      prsnCltCat: index('prsn_clt_cat').on(table.prsnCltCat, table.prsnCltMid),
      prsnCltUid: index('prsn_clt_uid').on(table.prsnCltUid),
      prsnCltMid: index('prsn_clt_mid').on(table.prsnCltMid),
    };
  },
);

export const chiiPersonCsIndex = mysqlTable(
  'chii_person_cs_index',
  {
    prsnType: mysqlEnum('prsn_type', ['prsn', 'crt']).notNull(),
    prsnId: mediumint('prsn_id').notNull(),
    prsnPosition: smallint('prsn_position').notNull(),
    subjectId: mediumint('subject_id').notNull(),
    subjectTypeId: tinyint('subject_type_id').notNull(),
    summary: mediumtext('summary').notNull(),
    prsnAppearEps: mediumtext('prsn_appear_eps').notNull(),
  },
  (table) => {
    return {
      subjectId: index('subject_id').on(table.subjectId),
      prsnPosition: index('prsn_position').on(table.prsnPosition),
      prsnId: index('prsn_id').on(table.prsnId),
      subjectTypeId: index('subject_type_id').on(table.subjectTypeId),
    };
  },
);

export const chiiPersonFields = mysqlTable(
  'chii_person_fields',
  {
    prsnCat: mysqlEnum('prsn_cat', ['prsn', 'crt']).notNull(),
    prsnId: int('prsn_id').notNull(),
    gender: tinyint('gender').notNull(),
    bloodtype: tinyint('bloodtype').notNull(),
    // Warning: Can't parse year(4) from database
    // year(4)Type: year(4)("birth_year").notNull(),
    birthMon: tinyint('birth_mon').notNull(),
    birthDay: tinyint('birth_day').notNull(),
  },
  (table) => {
    return {
      prsnId: index('prsn_id').on(table.prsnId),
    };
  },
);

export const chiiPersonRelationship = mysqlTable(
  'chii_person_relationship',
  {
    prsnType: mysqlEnum('prsn_type', ['prsn', 'crt']).notNull(),
    prsnId: mediumint('prsn_id').notNull(),
    relatPrsnType: mysqlEnum('relat_prsn_type', ['prsn', 'crt']).notNull(),
    relatPrsnId: mediumint('relat_prsn_id').notNull(),
    relatType: smallint('relat_type').notNull(),
  },
  (table) => {
    return {
      prsnType: index('prsn_type').on(table.prsnType, table.prsnId),
      relatPrsnType: index('relat_prsn_type').on(table.relatPrsnType, table.relatPrsnId),
    };
  },
);

export const chiiPms = mysqlTable(
  'chii_pms',
  {
    msgId: int('msg_id').autoincrement().notNull(),
    msgSid: mediumint('msg_sid').notNull(),
    msgRid: mediumint('msg_rid').notNull(),
    msgFolder: mysqlEnum('msg_folder', ['inbox', 'outbox']).default('inbox').notNull(),
    msgNew: tinyint('msg_new').default(0).notNull(),
    msgTitle: varchar('msg_title', { length: 75 }).notNull(),
    msgDateline: int('msg_dateline').default(0).notNull(),
    msgMessage: text('msg_message').notNull(),
    msgRelatedMain: int('msg_related_main').default(0).notNull(),
    msgRelated: int('msg_related').notNull(),
    msgSdeleted: tinyint('msg_sdeleted').default(0).notNull(),
    msgRdeleted: tinyint('msg_rdeleted').default(0).notNull(),
  },
  (table) => {
    return {
      msgSdeleted: index('msg_sdeleted').on(table.msgSdeleted, table.msgRdeleted),
      msgfromid: index('msgfromid').on(table.msgSid, table.msgFolder, table.msgDateline),
      msgtoid: index('msgtoid').on(table.msgRid, table.msgFolder, table.msgDateline),
      pmRelated: index('pm_related').on(table.msgRelated),
    };
  },
);

export const chiiPrsnComments = mysqlTable(
  'chii_prsn_comments',
  {
    prsnPstId: mediumint('prsn_pst_id').autoincrement().notNull(),
    prsnPstMid: mediumint('prsn_pst_mid').notNull(),
    prsnPstUid: mediumint('prsn_pst_uid').notNull(),
    prsnPstRelated: mediumint('prsn_pst_related').notNull(),
    prsnPstDateline: int('prsn_pst_dateline').notNull(),
    prsnPstContent: mediumtext('prsn_pst_content').notNull(),
  },
  (table) => {
    return {
      cmtPrsnId: index('cmt_prsn_id').on(table.prsnPstMid),
      prsnPstRelated: index('prsn_pst_related').on(table.prsnPstRelated),
      prsnPstUid: index('prsn_pst_uid').on(table.prsnPstUid),
    };
  },
);

export const chiiRevHistory = mysqlTable(
  'chii_rev_history',
  {
    revId: mediumint('rev_id').autoincrement().notNull(),
    revType: tinyint('rev_type').notNull(),
    revMid: mediumint('rev_mid').notNull(),
    revTextId: mediumint('rev_text_id').notNull(),
    revDateline: int('rev_dateline').notNull(),
    revCreator: mediumint('rev_creator').notNull(),
    revEditSummary: varchar('rev_edit_summary', { length: 200 }).notNull(),
  },
  (table) => {
    return {
      revCrtId: index('rev_crt_id').on(table.revType, table.revMid),
      revCrtCreator: index('rev_crt_creator').on(table.revCreator),
      revId: index('rev_id').on(table.revId, table.revType, table.revCreator),
    };
  },
);

export const chiiRevText = mysqlTable('chii_rev_text', {
  revTextId: mediumint('rev_text_id').autoincrement().notNull(),
  // Warning: Can't parse mediumblob from database
  // mediumblobType: mediumblob("rev_text").notNull(),
});

export const chiiSubjects = mysqlTable(
  'chii_subjects',
  {
    subjectId: mediumint('subject_id').autoincrement().notNull(),
    subjectTypeId: smallint('subject_type_id').notNull(),
    subjectName: varchar('subject_name', { length: 80 }).notNull(),
    subjectNameCn: varchar('subject_name_cn', { length: 80 }).notNull(),
    subjectUid: varchar('subject_uid', { length: 20 }).notNull(),
    subjectCreator: mediumint('subject_creator').notNull(),
    subjectDateline: int('subject_dateline').default(0).notNull(),
    subjectImage: varchar('subject_image', { length: 255 }).notNull(),
    subjectPlatform: smallint('subject_platform').notNull(),
    fieldInfobox: mediumtext('field_infobox').notNull(),
    fieldSummary: mediumtext('field_summary').notNull(),
    field5: mediumtext('field_5').notNull(),
    fieldVolumes: mediumint('field_volumes').notNull(),
    fieldEps: mediumint('field_eps').notNull(),
    subjectWish: mediumint('subject_wish').notNull(),
    subjectCollect: mediumint('subject_collect').notNull(),
    subjectDoing: mediumint('subject_doing').notNull(),
    subjectOnHold: mediumint('subject_on_hold').notNull(),
    subjectDropped: mediumint('subject_dropped').notNull(),
    subjectSeries: tinyint('subject_series').default(0).notNull(),
    subjectSeriesEntry: mediumint('subject_series_entry').notNull(),
    subjectIdxCn: varchar('subject_idx_cn', { length: 1 }).notNull(),
    subjectAirtime: tinyint('subject_airtime').notNull(),
    subjectNsfw: tinyint('subject_nsfw').notNull(),
    subjectBan: tinyint('subject_ban').default(0).notNull(),
  },
  (table) => {
    return {
      subjectNameCn: index('subject_name_cn').on(table.subjectNameCn),
      subjectPlatform: index('subject_platform').on(table.subjectPlatform),
      subjectCreator: index('subject_creator').on(table.subjectCreator),
      subjectSeries: index('subject_series').on(table.subjectSeries),
      subjectSeriesEntry: index('subject_series_entry').on(table.subjectSeriesEntry),
      subjectAirtime: index('subject_airtime').on(table.subjectAirtime),
      subjectBan: index('subject_ban').on(table.subjectBan),
      subjectIdxCn: index('subject_idx_cn').on(table.subjectIdxCn, table.subjectTypeId),
      subjectTypeId: index('subject_type_id').on(table.subjectTypeId),
      subjectName: index('subject_name').on(table.subjectName),
      orderByName: index('order_by_name').on(
        table.subjectBan,
        table.subjectTypeId,
        table.subjectSeries,
        table.subjectPlatform,
        table.subjectName,
      ),
      browser: index('browser').on(
        table.subjectBan,
        table.subjectTypeId,
        table.subjectSeries,
        table.subjectPlatform,
      ),
      subjectNsfw: index('subject_nsfw').on(table.subjectNsfw),
    };
  },
);

export const chiiSubjectAlias = mysqlTable(
  'chii_subject_alias',
  {
    subjectId: int('subject_id').notNull(),
    aliasName: varchar('alias_name', { length: 255 }).notNull(),
    subjectTypeId: tinyint('subject_type_id').default(0).notNull(),
    aliasType: tinyint('alias_type').default(0).notNull(),
    aliasKey: varchar('alias_key', { length: 10 }).notNull(),
  },
  (table) => {
    return {
      subjectId: index('subject_id').on(table.subjectId),
    };
  },
);

export const chiiSubjectFields = mysqlTable(
  'chii_subject_fields',
  {
    fieldSid: mediumint('field_sid').autoincrement().notNull(),
    fieldTid: smallint('field_tid').notNull(),
    fieldTags: mediumtext('field_tags').notNull(),
    fieldRate1: mediumint('field_rate_1').notNull(),
    fieldRate2: mediumint('field_rate_2').notNull(),
    fieldRate3: mediumint('field_rate_3').notNull(),
    fieldRate4: mediumint('field_rate_4').notNull(),
    fieldRate5: mediumint('field_rate_5').notNull(),
    fieldRate6: mediumint('field_rate_6').notNull(),
    fieldRate7: mediumint('field_rate_7').notNull(),
    fieldRate8: mediumint('field_rate_8').notNull(),
    fieldRate9: mediumint('field_rate_9').notNull(),
    fieldRate10: mediumint('field_rate_10').notNull(),
    fieldAirtime: tinyint('field_airtime').notNull(),
    fieldRank: int('field_rank').default(0).notNull(),
    // Warning: Can't parse year(4) from database
    fieldYear: year('field_year').notNull(),
    fieldMon: tinyint('field_mon').notNull(),
    fieldWeekDay: tinyint('field_week_day').notNull(),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    fieldDate: date('field_date', { mode: 'string' }).notNull(),
    fieldRedirect: mediumint('field_redirect').notNull(),
  },
  (table) => {
    return {
      sortId: index('sort_id').on(table.fieldTid),
      subjectAirtime: index('subject_airtime').on(table.fieldAirtime),
      fieldRank: index('field_rank').on(table.fieldRank),
      fieldDate: index('field_date').on(table.fieldDate),
      fieldYearMon: index('field_year_mon').on(table.fieldYear, table.fieldMon),
      fieldYear: index('field_year').on(table.fieldYear),
      queryDate: index('query_date').on(table.fieldSid, table.fieldDate),
    };
  },
);

export const chiiSubjectImgs = mysqlTable(
  'chii_subject_imgs',
  {
    imgId: mediumint('img_id').autoincrement().notNull(),
    imgSubjectId: mediumint('img_subject_id').notNull(),
    imgUid: mediumint('img_uid').notNull(),
    imgTarget: varchar('img_target', { length: 255 }).notNull(),
    imgVote: mediumint('img_vote').notNull(),
    imgNsfw: tinyint('img_nsfw').notNull(),
    imgBan: tinyint('img_ban').notNull(),
    imgDateline: int('img_dateline').notNull(),
  },
  (table) => {
    return {
      imgSubjectId: index('img_subject_id').on(table.imgSubjectId),
      imgNsfw: index('img_nsfw').on(table.imgNsfw, table.imgBan),
    };
  },
);

export const chiiSubjectInterests = mysqlTable(
  'chii_subject_interests',
  {
    interestId: int('interest_id').autoincrement().notNull(),
    interestUid: mediumint('interest_uid').notNull(),
    interestSubjectId: mediumint('interest_subject_id').notNull(),
    interestSubjectType: smallint('interest_subject_type').notNull(),
    interestRate: tinyint('interest_rate').default(0).notNull(),
    interestType: tinyint('interest_type').default(0).notNull(),
    interestHasComment: tinyint('interest_has_comment').notNull(),
    interestComment: mediumtext('interest_comment').notNull(),
    interestTag: mediumtext('interest_tag').notNull(),
    interestEpStatus: mediumint('interest_ep_status').notNull(),
    interestVolStatus: mediumint('interest_vol_status').notNull(),
    interestWishDateline: int('interest_wish_dateline').notNull(),
    interestDoingDateline: int('interest_doing_dateline').notNull(),
    interestCollectDateline: int('interest_collect_dateline').notNull(),
    interestOnHoldDateline: int('interest_on_hold_dateline').notNull(),
    interestDroppedDateline: int('interest_dropped_dateline').notNull(),
    interestCreateIp: char('interest_create_ip', { length: 15 }).notNull(),
    interestLasttouchIp: char('interest_lasttouch_ip', { length: 15 }).notNull(),
    interestLasttouch: int('interest_lasttouch').default(0).notNull(),
    interestPrivate: tinyint('interest_private').notNull(),
  },
  (table) => {
    return {
      interestCollectDateline: index('interest_collect_dateline').on(table.interestCollectDateline),
      interestId: index('interest_id').on(table.interestUid, table.interestPrivate),
      interestLasttouch: index('interest_lasttouch').on(table.interestLasttouch),
      interestPrivate: index('interest_private').on(table.interestPrivate),
      interestRate: index('interest_rate').on(table.interestRate),
      interestSubjectId: index('interest_subject_id').on(
        table.interestSubjectId,
        table.interestType,
      ),
      interestSubjectId2: index('interest_subject_id_2').on(table.interestSubjectId),
      interestSubjectType: index('interest_subject_type').on(table.interestSubjectType),
      interestType: index('interest_type').on(table.interestType),
      interestType2: index('interest_type_2').on(table.interestType, table.interestUid),
      interestUid: index('interest_uid').on(table.interestUid),
      interestUid2: index('interest_uid_2').on(
        table.interestUid,
        table.interestPrivate,
        table.interestLasttouch,
      ),
      subjectCollect: index('subject_collect').on(
        table.interestSubjectId,
        table.interestType,
        table.interestPrivate,
        table.interestCollectDateline,
      ),
      subjectComment: index('subject_comment').on(
        table.interestSubjectId,
        table.interestHasComment,
        table.interestPrivate,
        table.interestLasttouch,
      ),
      subjectLasttouch: index('subject_lasttouch').on(
        table.interestSubjectId,
        table.interestPrivate,
        table.interestLasttouch,
      ),
      subjectRate: index('subject_rate').on(
        table.interestSubjectId,
        table.interestRate,
        table.interestPrivate,
      ),
      tagSubjectId: index('tag_subject_id').on(
        table.interestSubjectType,
        table.interestType,
        table.interestUid,
      ),
      topSubject: index('top_subject').on(
        table.interestSubjectId,
        table.interestSubjectType,
        table.interestDoingDateline,
      ),
      userCollectLatest: index('user_collect_latest').on(
        table.interestSubjectType,
        table.interestType,
        table.interestUid,
        table.interestPrivate,
      ),
      userCollectType: index('user_collect_type').on(
        table.interestSubjectType,
        table.interestType,
        table.interestUid,
        table.interestPrivate,
        table.interestCollectDateline,
      ),
      userCollects: index('user_collects').on(table.interestSubjectType, table.interestUid),
      userInterest: unique('user_interest').on(table.interestUid, table.interestSubjectId),
    };
  },
);

export const chiiSubjectPosts = mysqlTable(
  'chii_subject_posts',
  {
    sbjPstId: mediumint('sbj_pst_id').autoincrement().notNull(),
    sbjPstMid: mediumint('sbj_pst_mid').notNull(),
    sbjPstUid: mediumint('sbj_pst_uid').notNull(),
    sbjPstRelated: mediumint('sbj_pst_related').notNull(),
    sbjPstContent: mediumtext('sbj_pst_content').notNull(),
    sbjPstState: tinyint('sbj_pst_state').notNull(),
    sbjPstDateline: int('sbj_pst_dateline').default(0).notNull(),
  },
  (table) => {
    return {
      pssTopicId: index('pss_topic_id').on(table.sbjPstMid),
      sbjPstRelated: index('sbj_pst_related').on(table.sbjPstRelated),
      sbjPstUid: index('sbj_pst_uid').on(table.sbjPstUid),
    };
  },
);

export const chiiSubjectRec = mysqlTable(
  'chii_subject_rec',
  {
    subjectId: mediumint('subject_id').notNull(),
    recSubjectId: mediumint('rec_subject_id').notNull(),
    mioSim: float('mio_sim').notNull(),
    mioCount: mediumint('mio_count').notNull(),
  },
  (table) => {
    return {
      subjectId: index('subject_id').on(table.subjectId),
      mioCount: index('mio_count').on(table.mioCount),
    };
  },
);

export const chiiSubjectRelations = mysqlTable(
  'chii_subject_relations',
  {
    rltSubjectId: mediumint('rlt_subject_id').notNull(),
    rltSubjectTypeId: tinyint('rlt_subject_type_id').notNull(),
    rltRelationType: smallint('rlt_relation_type').notNull(),
    rltRelatedSubjectId: mediumint('rlt_related_subject_id').notNull(),
    rltRelatedSubjectTypeId: tinyint('rlt_related_subject_type_id').notNull(),
    rltViceVersa: tinyint('rlt_vice_versa').notNull(),
    rltOrder: tinyint('rlt_order').notNull(),
  },
  (table) => {
    return {
      rltRelatedSubjectTypeId: index('rlt_related_subject_type_id').on(
        table.rltRelatedSubjectTypeId,
        table.rltOrder,
      ),
      rltSubjectTypeId: index('rlt_subject_type_id').on(table.rltSubjectTypeId),
      rltRelationType: index('rlt_relation_type').on(
        table.rltRelationType,
        table.rltSubjectId,
        table.rltRelatedSubjectId,
      ),
      rltSubjectId: unique('rlt_subject_id').on(
        table.rltSubjectId,
        table.rltRelatedSubjectId,
        table.rltViceVersa,
      ),
    };
  },
);

export const chiiSubjectRevisions = mysqlTable(
  'chii_subject_revisions',
  {
    revId: mediumint('rev_id').autoincrement().notNull(),
    revType: tinyint('rev_type').default(1).notNull(),
    revSubjectId: mediumint('rev_subject_id').notNull(),
    revTypeId: smallint('rev_type_id').notNull(),
    revCreator: mediumint('rev_creator').notNull(),
    revDateline: int('rev_dateline').default(0).notNull(),
    revName: varchar('rev_name', { length: 80 }).notNull(),
    revNameCn: varchar('rev_name_cn', { length: 80 }).notNull(),
    revFieldInfobox: mediumtext('rev_field_infobox').notNull(),
    revFieldSummary: mediumtext('rev_field_summary').notNull(),
    revVoteField: mediumtext('rev_vote_field').notNull(),
    revFieldEps: mediumint('rev_field_eps').notNull(),
    revEditSummary: varchar('rev_edit_summary', { length: 200 }).notNull(),
    revPlatform: smallint('rev_platform').notNull(),
  },
  (table) => {
    return {
      revSubjectId: index('rev_subject_id').on(table.revSubjectId, table.revCreator),
      revType: index('rev_type').on(table.revType),
      revDateline: index('rev_dateline').on(table.revDateline),
      revCreator: index('rev_creator').on(table.revCreator, table.revId),
    };
  },
);

export const chiiSubjectTopics = mysqlTable(
  'chii_subject_topics',
  {
    sbjTpcId: mediumint('sbj_tpc_id').autoincrement().notNull(),
    sbjTpcSubjectId: mediumint('sbj_tpc_subject_id').notNull(),
    sbjTpcUid: mediumint('sbj_tpc_uid').notNull(),
    sbjTpcTitle: varchar('sbj_tpc_title', { length: 80 }).notNull(),
    sbjTpcDateline: int('sbj_tpc_dateline').default(0).notNull(),
    sbjTpcLastpost: int('sbj_tpc_lastpost').default(0).notNull(),
    sbjTpcReplies: mediumint('sbj_tpc_replies').notNull(),
    sbjTpcState: tinyint('sbj_tpc_state').notNull(),
    sbjTpcDisplay: tinyint('sbj_tpc_display').default(1).notNull(),
  },
  (table) => {
    return {
      tpcSubjectId: index('tpc_subject_id').on(table.sbjTpcSubjectId),
      tpcDisplay: index('tpc_display').on(table.sbjTpcDisplay),
      sbjTpcUid: index('sbj_tpc_uid').on(table.sbjTpcUid),
      sbjTpcLastpost: index('sbj_tpc_lastpost').on(
        table.sbjTpcLastpost,
        table.sbjTpcSubjectId,
        table.sbjTpcDisplay,
      ),
    };
  },
);

export const chiiTagNeueIndex = mysqlTable(
  'chii_tag_neue_index',
  {
    tagId: mediumint('tag_id').autoincrement().notNull(),
    tagName: varchar('tag_name', { length: 30 }).notNull(),
    tagCat: tinyint('tag_cat').notNull(),
    tagType: tinyint('tag_type').notNull(),
    tagResults: mediumint('tag_results').notNull(),
    tagDateline: int('tag_dateline').notNull(),
    tagLasttouch: int('tag_lasttouch').notNull(),
  },
  (table) => {
    return {
      tagCat: index('tag_cat').on(table.tagCat, table.tagType),
      tagResults: index('tag_results').on(table.tagCat, table.tagType, table.tagResults),
      tagQuery: index('tag_query').on(table.tagName, table.tagCat, table.tagType),
    };
  },
);

export const chiiTagNeueList = mysqlTable(
  'chii_tag_neue_list',
  {
    tltTid: mediumint('tlt_tid').notNull(),
    tltUid: mediumint('tlt_uid').notNull(),
    tltCat: tinyint('tlt_cat').notNull(),
    tltType: tinyint('tlt_type').notNull(),
    tltMid: mediumint('tlt_mid').notNull(),
    tltDateline: int('tlt_dateline').notNull(),
  },
  (table) => {
    return {
      tltTid: index('tlt_tid').on(
        table.tltTid,
        table.tltUid,
        table.tltCat,
        table.tltType,
        table.tltMid,
      ),
      userTags: index('user_tags').on(table.tltUid, table.tltCat, table.tltMid, table.tltTid),
      subjectTags: index('subject_tags').on(table.tltCat, table.tltMid, table.tltTid),
      tagToSubject: index('tag_to_subject').on(table.tltTid, table.tltMid),
    };
  },
);

export const chiiTimeline = mysqlTable(
  'chii_timeline',
  {
    tmlId: int('tml_id').autoincrement().notNull(),
    tmlUid: mediumint('tml_uid').notNull(),
    tmlCat: smallint('tml_cat').notNull(),
    tmlType: smallint('tml_type').notNull(),
    tmlRelated: char('tml_related', { length: 255 }).default('0').notNull(),
    tmlMemo: mediumtext('tml_memo').notNull(),
    tmlImg: mediumtext('tml_img').notNull(),
    tmlBatch: tinyint('tml_batch').notNull(),
    tmlSource: tinyint('tml_source').default(0).notNull(),
    tmlReplies: mediumint('tml_replies').notNull(),
    tmlDateline: int('tml_dateline').default(0).notNull(),
  },
  (table) => {
    return {
      tmlUid: index('tml_uid').on(table.tmlUid),
      tmlCat: index('tml_cat').on(table.tmlCat),
      tmlBatch: index('tml_batch').on(table.tmlBatch),
      queryTmlCat: index('query_tml_cat').on(table.tmlUid, table.tmlCat),
    };
  },
);

export const chiiUsergroup = mysqlTable('chii_usergroup', {
  id: mediumint('usr_grp_id').autoincrement().notNull(),
  name: varchar('usr_grp_name', { length: 255 }).notNull(),
  perm: mediumtext('usr_grp_perm').notNull(),
  updatedAt: int('usr_grp_dateline').notNull(),
});
