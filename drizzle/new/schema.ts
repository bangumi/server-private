import {
  mysqlTable,
  mysqlSchema,
  AnyMySqlColumn,
  index,
  tinyint,
  varchar,
  mediumtext,
  bigint,
  mediumint,
  int,
  smallint,
  char,
  unique,
  text,
  float,
  date,
  timestamp,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const chiiApps = mysqlTable(
  'chii_apps',
  {
    appId: mediumint('app_id').autoincrement().notNull(),
    appType: tinyint('app_type').notNull(),
    appCreator: mediumint('app_creator').notNull(),
    appName: varchar('app_name', { length: 255 }).notNull(),
    appDesc: mediumtext('app_desc').notNull(),
    appUrl: varchar('app_url', { length: 2000 }).notNull(),
    appIsThirdParty: tinyint('app_is_third_party').notNull(),
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

export const chiiAppCollects = mysqlTable(
  'chii_app_collects',
  {
    appCltId: mediumint('app_clt_id').autoincrement().notNull(),
    appCltAppId: mediumint('app_clt_app_id').notNull(),
    appCltUid: mediumint('app_clt_uid').notNull(),
    appCltDateline: int('app_clt_dateline').notNull(),
  },
  (table) => {
    return {
      ambAppId: index('amb_app_id').on(table.appCltAppId, table.appCltUid),
      appCltUid: index('app_clt_uid').on(table.appCltUid),
    };
  },
);

export const chiiBlogComments = mysqlTable(
  'chii_blog_comments',
  {
    blgPstId: mediumint('blg_pst_id').autoincrement().notNull(),
    blgPstMid: mediumint('blg_pst_mid').notNull(),
    blgPstUid: mediumint('blg_pst_uid').notNull(),
    blgPstRelated: mediumint('blg_pst_related').notNull(),
    blgPstDateline: int('blg_pst_dateline').notNull(),
    blgPstContent: mediumtext('blg_pst_content').notNull(),
  },
  (table) => {
    return {
      blgCmtEid: index('blg_cmt_eid').on(table.blgPstMid),
      blgCmtUid: index('blg_cmt_uid').on(table.blgPstUid),
      blgPstRelated: index('blg_pst_related').on(table.blgPstRelated),
    };
  },
);

export const chiiBlogEntry = mysqlTable(
  'chii_blog_entry',
  {
    entryId: mediumint('entry_id').autoincrement().notNull(),
    entryType: smallint('entry_type').notNull(),
    entryUid: mediumint('entry_uid').notNull(),
    entryTitle: varchar('entry_title', { length: 80 }).notNull(),
    entryIcon: varchar('entry_icon', { length: 255 }).notNull(),
    entryContent: mediumtext('entry_content').notNull(),
    entryTags: mediumtext('entry_tags').notNull(),
    entryViews: mediumint('entry_views').notNull(),
    entryReplies: mediumint('entry_replies').notNull(),
    entryDateline: int('entry_dateline').notNull(),
    entryLastpost: int('entry_lastpost').notNull(),
    entryLike: int('entry_like').notNull(),
    entryDislike: int('entry_dislike').notNull(),
    entryNoreply: smallint('entry_noreply').notNull(),
    entryRelated: tinyint('entry_related').default(0).notNull(),
    entryPublic: tinyint('entry_public').default(1).notNull(),
  },
  (table) => {
    return {
      entryType: index('entry_type').on(table.entryType, table.entryUid, table.entryNoreply),
      entryRelate: index('entry_relate').on(table.entryRelated),
      entryPublic: index('entry_public').on(table.entryPublic),
      entryDateline: index('entry_dateline').on(table.entryDateline),
      entryUid: index('entry_uid').on(table.entryUid, table.entryPublic),
    };
  },
);

export const chiiBlogPhoto = mysqlTable(
  'chii_blog_photo',
  {
    photoId: mediumint('photo_id').autoincrement().notNull(),
    photoEid: mediumint('photo_eid').notNull(),
    photoUid: mediumint('photo_uid').notNull(),
    photoTarget: varchar('photo_target', { length: 255 }).notNull(),
    photoVote: mediumint('photo_vote').notNull(),
    photoDateline: int('photo_dateline').notNull(),
  },
  (table) => {
    return {
      photoEid: index('photo_eid').on(table.photoEid),
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
      crtCollects: index('crt_collects').on(table.crtCollects),
      crtComment: index('crt_comment').on(table.crtComment),
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
    crtPstState: tinyint('crt_pst_state').notNull(),
  },
  (table) => {
    return {
      cmtCrtId: index('cmt_crt_id').on(table.crtPstMid),
      crtPstRelated: index('crt_pst_related').on(table.crtPstRelated),
      crtPstUid: index('crt_pst_uid').on(table.crtPstUid),
    };
  },
);

export const chiiCrtRevisions = mysqlTable(
  'chii_crt_revisions',
  {
    revId: mediumint('rev_id').autoincrement().notNull(),
    revCrtId: mediumint('rev_crt_id').notNull(),
    revCrtName: varchar('rev_crt_name', { length: 80 }).notNull(),
    revCrtNameCn: varchar('rev_crt_name_cn', { length: 80 }).notNull(),
    revCrtInfoWiki: mediumtext('rev_crt_info_wiki').notNull(),
    revCrtSummary: mediumtext('rev_crt_summary').notNull(),
    revDateline: int('rev_dateline').notNull(),
    revCreator: mediumint('rev_creator').notNull(),
    revEditSummary: varchar('rev_edit_summary', { length: 200 }).notNull(),
  },
  (table) => {
    return {
      revCrtId: index('rev_crt_id').on(table.revCrtId),
      revCrtCreator: index('rev_crt_creator').on(table.revCreator),
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

export const chiiCrtSubjectIndexBak240803 = mysqlTable(
  'chii_crt_subject_index_bak_240803',
  {
    crtId: mediumint('crt_id').notNull(),
    subjectId: mediumint('subject_id').notNull(),
    subjectTypeId: tinyint('subject_type_id').notNull(),
    crtType: tinyint('crt_type').notNull(),
    ctrAppearEps: mediumtext('ctr_appear_eps').notNull(),
    crtOrder: tinyint('crt_order').notNull(),
  },
  (table) => {
    return {
      subjectId: index('subject_id').on(table.subjectId),
      crtType: index('crt_type').on(table.crtType),
      subjectTypeId: index('subject_type_id').on(table.subjectTypeId),
    };
  },
);

export const chiiDoujinClubs = mysqlTable(
  'chii_doujin_clubs',
  {
    clubId: mediumint('club_id').autoincrement().notNull(),
    clubType: tinyint('club_type').notNull(),
    clubName: char('club_name', { length: 50 }).notNull(),
    clubTitle: char('club_title', { length: 50 }).notNull(),
    clubIcon: varchar('club_icon', { length: 255 }).notNull(),
    clubCreator: mediumint('club_creator').notNull(),
    clubProBook: tinyint('club_pro_book').default(0).notNull(),
    clubProMusic: tinyint('club_pro_music').default(0).notNull(),
    clubProGame: tinyint('club_pro_game').default(0).notNull(),
    clubMembers: mediumint('club_members').notNull(),
    clubFollowers: mediumint('club_followers').notNull(),
    clubDesc: mediumtext('club_desc').notNull(),
    clubBuilddate: int('club_builddate').notNull(),
    clubLastupdate: int('club_lastupdate').notNull(),
    clubBan: tinyint('club_ban').default(0).notNull(),
  },
  (table) => {
    return {
      clubType: index('club_type').on(table.clubType, table.clubBan),
      clubName: index('club_name').on(table.clubName),
    };
  },
);

export const chiiDoujinClubComments = mysqlTable(
  'chii_doujin_club_comments',
  {
    clubPstId: mediumint('club_pst_id').autoincrement().notNull(),
    clubPstMid: mediumint('club_pst_mid').notNull(),
    clubPstUid: mediumint('club_pst_uid').notNull(),
    clubPstRelated: mediumint('club_pst_related').notNull(),
    clubPstDateline: int('club_pst_dateline').notNull(),
    clubPstContent: mediumtext('club_pst_content').notNull(),
  },
  (table) => {
    return {
      clubPstMid: index('club_pst_mid').on(table.clubPstMid),
      clubPstRelated: index('club_pst_related').on(table.clubPstRelated),
      clubPstUid: index('club_pst_uid').on(table.clubPstUid),
    };
  },
);

export const chiiDoujinClubFields = mysqlTable(
  'chii_doujin_club_fields',
  {
    cfCid: mediumint('cf_cid').notNull(),
    cfHeader: varchar('cf_header', { length: 255 }).notNull(),
    cfBg: varchar('cf_bg', { length: 255 }).notNull(),
    cfTheme: tinyint('cf_theme').default(1).notNull(),
    cfDesign: mediumtext('cf_design').notNull(),
    cfModel: mediumtext('cf_model').notNull(),
  },
  (table) => {
    return {
      cfTheme: index('cf_theme').on(table.cfTheme),
      cfCid: unique('cf_cid').on(table.cfCid),
    };
  },
);

export const chiiDoujinClubMembers = mysqlTable(
  'chii_doujin_club_members',
  {
    cmbUid: mediumint('cmb_uid').notNull(),
    cmbCid: mediumint('cmb_cid').notNull(),
    cmbModerator: tinyint('cmb_moderator').notNull(),
    cmbPerm: mediumtext('cmb_perm').notNull(),
    cmbNote: varchar('cmb_note', { length: 255 }).notNull(),
    cmbDeteline: int('cmb_deteline').notNull(),
  },
  (table) => {
    return {
      queryFollowers: index('query_followers').on(
        table.cmbModerator,
        table.cmbCid,
        table.cmbDeteline,
      ),
    };
  },
);

export const chiiDoujinClubPosts = mysqlTable(
  'chii_doujin_club_posts',
  {
    clubPstId: mediumint('club_pst_id').autoincrement().notNull(),
    clubPstMid: mediumint('club_pst_mid').notNull(),
    clubPstUid: mediumint('club_pst_uid').notNull(),
    clubPstRelated: mediumint('club_pst_related').notNull(),
    clubPstContent: mediumtext('club_pst_content').notNull(),
    clubPstDateline: int('club_pst_dateline').default(0).notNull(),
  },
  (table) => {
    return {
      pssTopicId: index('pss_topic_id').on(table.clubPstMid),
      clubPstRelated: index('club_pst_related').on(table.clubPstRelated),
      clubPstUid: index('club_pst_uid').on(table.clubPstUid),
    };
  },
);

export const chiiDoujinClubRelatedBlog = mysqlTable(
  'chii_doujin_club_related_blog',
  {
    crbId: mediumint('crb_id').autoincrement().notNull(),
    crbUid: mediumint('crb_uid').notNull(),
    crbClubId: mediumint('crb_club_id').notNull(),
    crbEntryId: mediumint('crb_entry_id').notNull(),
    crbStick: tinyint('crb_stick').default(0).notNull(),
    crbDateline: int('crb_dateline').notNull(),
  },
  (table) => {
    return {
      crbClubId: index('crb_club_id').on(table.crbClubId, table.crbEntryId),
      crbEntryId: index('crb_entry_id').on(table.crbEntryId),
    };
  },
);

export const chiiDoujinClubTimeline = mysqlTable(
  'chii_doujin_club_timeline',
  {
    tmlId: mediumint('tml_id').autoincrement().notNull(),
    tmlCid: mediumint('tml_cid').notNull(),
    tmlType: smallint('tml_type').notNull(),
    tmlRelated: char('tml_related', { length: 255 }).default('0').notNull(),
    tmlMemo: mediumtext('tml_memo').notNull(),
    tmlDateline: int('tml_dateline').default(0).notNull(),
  },
  (table) => {
    return {
      tmlUid: index('tml_uid').on(table.tmlCid),
      idUid: index('id_uid').on(table.tmlId, table.tmlCid),
    };
  },
);

export const chiiDoujinClubTopics = mysqlTable(
  'chii_doujin_club_topics',
  {
    clubTpcId: mediumint('club_tpc_id').autoincrement().notNull(),
    clubTpcClubId: mediumint('club_tpc_club_id').notNull(),
    clubTpcUid: mediumint('club_tpc_uid').notNull(),
    clubTpcTitle: varchar('club_tpc_title', { length: 80 }).notNull(),
    clubTpcDateline: int('club_tpc_dateline').default(0).notNull(),
    clubTpcLastpost: int('club_tpc_lastpost').default(0).notNull(),
    clubTpcReplies: mediumint('club_tpc_replies').notNull(),
    clubTpcDisplay: tinyint('club_tpc_display').default(1).notNull(),
  },
  (table) => {
    return {
      tpcSubjectId: index('tpc_subject_id').on(table.clubTpcClubId),
      tpcDisplay: index('tpc_display').on(table.clubTpcDisplay),
    };
  },
);

export const chiiDoujinInvites = mysqlTable(
  'chii_doujin_invites',
  {
    uid: mediumint('uid').notNull(),
    dateline: int('dateline').notNull(),
    invitecode: char('invitecode', { length: 19 }).notNull(),
    status: tinyint('status').default(0).notNull(),
    inviteUid: mediumint('invite_uid').notNull(),
  },
  (table) => {
    return {
      uid: index('uid').on(table.uid),
    };
  },
);

export const chiiDoujinPreorder = mysqlTable(
  'chii_doujin_preorder',
  {
    preId: mediumint('pre_id').autoincrement().notNull(),
    preUid: mediumint('pre_uid').notNull(),
    preType: tinyint('pre_type').notNull(),
    preMid: mediumint('pre_mid').notNull(),
    preDetails: mediumtext('pre_details').notNull(),
    preDateline: int('pre_dateline').notNull(),
  },
  (table) => {
    return {
      preUid: index('pre_uid').on(table.preUid, table.preType, table.preMid),
    };
  },
);

export const chiiDoujinPreorderReturn = mysqlTable(
  'chii_doujin_preorder_return',
  {
    rtId: bigint('rt_id', { mode: 'number' }).notNull(),
    rtPid: int('rt_pid').autoincrement().notNull(),
    rtUid: mediumint('rt_uid').notNull(),
    rtStatus: tinyint('rt_status').notNull(),
    rtJuiz: mediumint('rt_juiz').notNull(),
    rtPaymail: varchar('rt_paymail', { length: 255 }).notNull(),
    rtPhone: varchar('rt_phone', { length: 255 }).notNull(),
    rtRealname: varchar('rt_realname', { length: 255 }).notNull(),
    rtUname: varchar('rt_uname', { length: 255 }).notNull(),
    rtRemark: text('rt_remark').notNull(),
    rtComment: text('rt_comment').notNull(),
    rtDateline: int('rt_dateline').notNull(),
  },
  (table) => {
    return {
      rtId: index('rt_id').on(table.rtId, table.rtStatus),
      rtPid: index('rt_pid').on(table.rtPid),
      rtId2: unique('rt_id_2').on(table.rtId),
    };
  },
);

export const chiiDoujinSubjects = mysqlTable(
  'chii_doujin_subjects',
  {
    subjectId: mediumint('subject_id').autoincrement().notNull(),
    subjectType: tinyint('subject_type').notNull(),
    subjectCat: tinyint('subject_cat').notNull(),
    subjectName: varchar('subject_name', { length: 255 }).notNull(),
    subjectInfobox: mediumtext('subject_infobox').notNull(),
    subjectDesc: mediumtext('subject_desc').notNull(),
    subjectImg: varchar('subject_img', { length: 255 }).notNull(),
    subjectCollects: mediumint('subject_collects').notNull(),
    subjectStatus: tinyint('subject_status').default(0).notNull(),
    subjectOriginal: tinyint('subject_original').default(0).notNull(),
    subjectSexual: tinyint('subject_sexual').default(0).notNull(),
    subjectAgeLimit: tinyint('subject_age_limit').default(0).notNull(),
    subjectTags: varchar('subject_tags', { length: 255 }).notNull(),
    subjectAttrTags: varchar('subject_attr_tags', { length: 255 }).notNull(),
    subjectCreator: mediumint('subject_creator').notNull(),
    subjectComment: mediumint('subject_comment').notNull(),
    subjectDateline: int('subject_dateline').notNull(),
    subjectLasttouch: int('subject_lasttouch').notNull(),
    subjectLastpost: int('subject_lastpost').notNull(),
    subjectBan: tinyint('subject_ban').notNull(),
    subjectBanReason: varchar('subject_ban_reason', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      subjectCat: index('subject_cat').on(
        table.subjectType,
        table.subjectCat,
        table.subjectCreator,
        table.subjectBan,
      ),
      subjectSexual: index('subject_sexual').on(
        table.subjectSexual,
        table.subjectAgeLimit,
        table.subjectOriginal,
        table.subjectStatus,
      ),
      subjectLastpost: index('subject_lastpost').on(table.subjectLastpost),
      subjectCreator: index('subject_creator').on(table.subjectCreator),
      subjectDateline: index('subject_dateline').on(table.subjectDateline),
      subjectType: index('subject_type').on(table.subjectType, table.subjectBan),
      subjectBan: index('subject_ban').on(table.subjectBan),
    };
  },
);

export const chiiDoujinSubjectAttrTags = mysqlTable(
  'chii_doujin_subject_attr_tags',
  {
    subjectId: mediumint('subject_id').notNull(),
    tagId: tinyint('tag_id').notNull(),
  },
  (table) => {
    return {
      subjectId: unique('subject_id').on(table.subjectId, table.tagId),
    };
  },
);

export const chiiDoujinSubjectClubIndex = mysqlTable(
  'chii_doujin_subject_club_index',
  {
    subjectId: mediumint('subject_id').notNull(),
    clubId: mediumint('club_id').notNull(),
    subjectType: tinyint('subject_type').notNull(),
    clubRole: tinyint('club_role').default(0).notNull(),
  },
  (table) => {
    return {
      subjectType: index('subject_type').on(table.subjectType),
      subjectId: unique('subject_id').on(table.subjectId, table.clubId),
    };
  },
);

export const chiiDoujinSubjectCollects = mysqlTable(
  'chii_doujin_subject_collects',
  {
    cltUid: mediumint('clt_uid').notNull(),
    cltSubjectId: mediumint('clt_subject_id').notNull(),
    cltSubjectType: tinyint('clt_subject_type').notNull(),
    cltDateline: int('clt_dateline').notNull(),
  },
  (table) => {
    return {
      cltUid: unique('clt_uid').on(table.cltUid, table.cltSubjectId),
    };
  },
);

export const chiiDoujinSubjectComments = mysqlTable(
  'chii_doujin_subject_comments',
  {
    sbjPstId: mediumint('sbj_pst_id').autoincrement().notNull(),
    sbjPstMid: mediumint('sbj_pst_mid').notNull(),
    sbjPstUid: mediumint('sbj_pst_uid').notNull(),
    sbjPstRelated: mediumint('sbj_pst_related').notNull(),
    sbjPstRelatedPhoto: mediumint('sbj_pst_related_photo').notNull(),
    sbjPstDateline: int('sbj_pst_dateline').notNull(),
    sbjPstContent: mediumtext('sbj_pst_content').notNull(),
  },
  (table) => {
    return {
      sbjPstMid: index('sbj_pst_mid').on(table.sbjPstMid),
      sbjPstRelated: index('sbj_pst_related').on(table.sbjPstRelated),
      sbjRelatedPhoto: index('sbj_related_photo').on(table.sbjPstRelatedPhoto),
      sbjPstUid: index('sbj_pst_uid').on(table.sbjPstUid),
    };
  },
);

export const chiiDoujinSubjectEventIndex = mysqlTable(
  'chii_doujin_subject_event_index',
  {
    eventId: mediumint('event_id').notNull(),
    subjectId: mediumint('subject_id').notNull(),
    subjectType: tinyint('subject_type').notNull(),
    dateline: int('dateline').notNull(),
  },
  (table) => {
    return {
      subjectType: index('subject_type').on(table.subjectType),
      eventId: unique('event_id').on(table.eventId, table.subjectId),
    };
  },
);

export const chiiDoujinSubjectPhotos = mysqlTable(
  'chii_doujin_subject_photos',
  {
    sbjPhotoId: mediumint('sbj_photo_id').autoincrement().notNull(),
    sbjPhotoMid: mediumint('sbj_photo_mid').notNull(),
    sbjPhotoUid: mediumint('sbj_photo_uid').notNull(),
    sbjPhotoTarget: text('sbj_photo_target').notNull(),
    sbjPhotoComment: mediumint('sbj_photo_comment').notNull(),
    sbjPhotoDateline: int('sbj_photo_dateline').notNull(),
    sbjPhotoLasttouch: int('sbj_photo_lasttouch').notNull(),
    sbjPhotoBan: tinyint('sbj_photo_ban').notNull(),
  },
  (table) => {
    return {
      sbjPhotoMid: index('sbj_photo_mid').on(table.sbjPhotoMid),
      sbjPhotoUid: index('sbj_photo_uid').on(table.sbjPhotoUid),
    };
  },
);

export const chiiEden = mysqlTable(
  'chii_eden',
  {
    edenId: smallint('eden_id').autoincrement().notNull(),
    edenType: smallint('eden_type').notNull(),
    edenName: char('eden_name', { length: 50 }).notNull(),
    edenTitle: char('eden_title', { length: 50 }).notNull(),
    edenIcon: varchar('eden_icon', { length: 255 }).notNull(),
    edenHeader: varchar('eden_header', { length: 255 }).notNull(),
    edenDesc: mediumtext('eden_desc').notNull(),
    edenRelateSubject: mediumtext('eden_relate_subject').notNull(),
    edenRelateGrp: mediumtext('eden_relate_grp').notNull(),
    edenMembers: mediumint('eden_members').notNull(),
    edenLasttouch: int('eden_lasttouch').notNull(),
    edenBuilddate: int('eden_builddate').notNull(),
    edenPushdate: int('eden_pushdate').notNull(),
  },
  (table) => {
    return {
      edenType: index('eden_type').on(table.edenType),
    };
  },
);

export const chiiEdenMembers = mysqlTable('chii_eden_members', {
  embUid: mediumint('emb_uid').notNull(),
  embEid: smallint('emb_eid').notNull(),
  embModerator: tinyint('emb_moderator').default(0).notNull(),
  embDateline: int('emb_dateline').default(0).notNull(),
});

export const chiiEpisodes = mysqlTable(
  'chii_episodes',
  {
    epId: mediumint('ep_id').autoincrement().notNull(),
    epSubjectId: mediumint('ep_subject_id').notNull(),
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

export const chiiEvents = mysqlTable(
  'chii_events',
  {
    eventId: int('event_id').autoincrement().notNull(),
    eventTitle: varchar('event_title', { length: 255 }).notNull(),
    eventType: tinyint('event_type').notNull(),
    eventCreator: int('event_creator').notNull(),
    eventStartTime: int('event_start_time').notNull(),
    eventEndTime: int('event_end_time').notNull(),
    eventImg: varchar('event_img', { length: 255 }).notNull(),
    eventState: mediumint('event_state').notNull(),
    eventCity: mediumint('event_city').notNull(),
    eventAddress: varchar('event_address', { length: 255 }).notNull(),
    eventDesc: text('event_desc').notNull(),
    eventWish: mediumint('event_wish').notNull(),
    eventDo: mediumint('event_do').notNull(),
    eventBuildtime: int('event_buildtime').notNull(),
    eventLastupdate: int('event_lastupdate').notNull(),
  },
  (table) => {
    return {
      eventType: index('event_type').on(table.eventType),
      eventArea: index('event_area').on(table.eventCity),
      eventStartTime: index('event_startTime').on(table.eventStartTime),
      eventEndTime: index('event_endTime').on(table.eventEndTime),
      eventLastupdate: index('event_lastupdate').on(table.eventLastupdate),
      eventBuildtime: index('event_buildtime').on(table.eventBuildtime),
      eventCreator: index('event_creator').on(table.eventCreator),
      eventState: index('event_state').on(table.eventState),
    };
  },
);

export const chiiEventClubIndex = mysqlTable(
  'chii_event_club_index',
  {
    eventId: mediumint('event_id').notNull(),
    clubId: mediumint('club_id').notNull(),
    clubPlace: varchar('club_place', { length: 255 }).notNull(),
    dateline: int('dateline').notNull(),
  },
  (table) => {
    return {
      eventId: unique('event_id').on(table.eventId, table.clubId),
    };
  },
);

export const chiiEventCollects = mysqlTable(
  'chii_event_collects',
  {
    cltUid: mediumint('clt_uid').notNull(),
    cltEventId: mediumint('clt_event_id').notNull(),
    cltType: tinyint('clt_type').notNull(),
    cltDateline: int('clt_dateline').notNull(),
  },
  (table) => {
    return {
      cltUid: unique('clt_uid').on(table.cltUid, table.cltEventId),
    };
  },
);

export const chiiEventPosts = mysqlTable(
  'chii_event_posts',
  {
    eventPstId: mediumint('event_pst_id').autoincrement().notNull(),
    eventPstMid: mediumint('event_pst_mid').notNull(),
    eventPstUid: mediumint('event_pst_uid').notNull(),
    eventPstRelated: mediumint('event_pst_related').notNull(),
    eventPstContent: mediumtext('event_pst_content').notNull(),
    eventPstDateline: int('event_pst_dateline').default(0).notNull(),
  },
  (table) => {
    return {
      pstTopicId: index('pst_topic_id').on(table.eventPstMid),
      eventPstRelated: index('event_pst_related').on(table.eventPstRelated),
      eventPstUid: index('event_pst_uid').on(table.eventPstUid),
    };
  },
);

export const chiiEventTopics = mysqlTable(
  'chii_event_topics',
  {
    eventTpcId: mediumint('event_tpc_id').autoincrement().notNull(),
    eventTpcMid: mediumint('event_tpc_mid').notNull(),
    eventTpcUid: mediumint('event_tpc_uid').notNull(),
    eventTpcTitle: varchar('event_tpc_title', { length: 80 }).notNull(),
    eventTpcDateline: int('event_tpc_dateline').default(0).notNull(),
    eventTpcLastpost: int('event_tpc_lastpost').default(0).notNull(),
    eventTpcReplies: mediumint('event_tpc_replies').notNull(),
    eventTpcDisplay: tinyint('event_tpc_display').default(1).notNull(),
  },
  (table) => {
    return {
      tpcRelateId: index('tpc_relate_id').on(table.eventTpcMid),
      tpcDisplay: index('tpc_display').on(table.eventTpcDisplay),
    };
  },
);

export const chiiFailedlogins = mysqlTable('chii_failedlogins', {
  ip: char('ip', { length: 15 }).default('').notNull(),
  count: tinyint('count').default(0).notNull(),
  lastupdate: int('lastupdate').default(0).notNull(),
});

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

export const chiiGadgets = mysqlTable(
  'chii_gadgets',
  {
    gdtId: mediumint('gdt_id').autoincrement().notNull(),
    gdtAppId: mediumint('gdt_app_id').notNull(),
    gdtVersion: varchar('gdt_version', { length: 255 }).notNull(),
    gdtCreator: mediumint('gdt_creator').notNull(),
    gdtScript: mediumtext('gdt_script').notNull(),
    gdtStyle: mediumtext('gdt_style').notNull(),
    gdtHasScript: tinyint('gdt_has_script').notNull(),
    gdtHasStyle: tinyint('gdt_has_style').notNull(),
    gdtStatus: tinyint('gdt_status').notNull(),
    gdtEditSummary: varchar('gdt_edit_summary', { length: 255 }).notNull(),
    gdtTimestamp: int('gdt_timestamp').notNull(),
    gdtLasttouch: int('gdt_lasttouch').notNull(),
  },
  (table) => {
    return {
      gdtAppId: index('gdt_app_id').on(table.gdtAppId, table.gdtStatus),
    };
  },
);

export const chiiGroups = mysqlTable(
  'chii_groups',
  {
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
  },
  (table) => {
    return {
      grpNsfw: index('grp_nsfw').on(table.grpNsfw),
    };
  },
);

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

export const chiiIssues = mysqlTable(
  'chii_issues',
  {
    isuId: mediumint('isu_id').autoincrement().notNull(),
    isuType: tinyint('isu_type').notNull(),
    isuMainId: mediumint('isu_main_id').notNull(),
    isuValue: mediumint('isu_value').notNull(),
    isuCreator: mediumint('isu_creator').notNull(),
    isuOperator: mediumint('isu_operator').notNull(),
    isuStatus: tinyint('isu_status').notNull(),
    isuReason: mediumtext('isu_reason').notNull(),
    isuRelated: mediumint('isu_related').notNull(),
    isuDateline: int('isu_dateline').notNull(),
  },
  (table) => {
    return {
      isuType: index('isu_type').on(
        table.isuType,
        table.isuMainId,
        table.isuCreator,
        table.isuOperator,
        table.isuStatus,
      ),
      isuValue: index('isu_value').on(table.isuValue),
    };
  },
);

export const chiiLikes = mysqlTable(
  'chii_likes',
  {
    type: mediumint('type').notNull(),
    mainId: int('main_id').default(0).notNull(),
    relatedId: int('related_id').notNull(),
    uid: mediumint('uid').notNull(),
    value: mediumint('value').notNull(),
    ban: tinyint('ban').default(0).notNull(),
    createdAt: int('created_at').notNull(),
  },
  (table) => {
    return {
      idxUid: index('idx_uid').on(table.uid),
      idxRelated: index('idx_related').on(table.relatedId),
      type: index('type').on(table.type, table.mainId, table.uid),
      createdAt: index('created_at').on(table.createdAt),
    };
  },
);

export const chiiLikesBak230331 = mysqlTable(
  'chii_likes_bak_230331',
  {
    type: mediumint('type').notNull(),
    mainId: int('main_id').notNull(),
    relatedId: int('related_id').notNull(),
    uid: mediumint('uid').notNull(),
    value: mediumint('value').notNull(),
    ban: tinyint('ban').default(0).notNull(),
    createdAt: int('created_at').notNull(),
  },
  (table) => {
    return {
      idxUid: index('idx_uid').on(table.uid),
      idxRelated: index('idx_related').on(table.relatedId),
      type: index('type').on(table.type, table.mainId, table.uid),
    };
  },
);

export const chiiMagiAnswered = mysqlTable(
  'chii_magi_answered',
  {
    aswQid: mediumint('asw_qid').notNull(),
    aswUid: mediumint('asw_uid').notNull(),
    aswAnswer: tinyint('asw_answer').notNull(),
    aswResult: tinyint('asw_result').notNull(),
    aswDateline: int('asw_dateline').notNull(),
  },
  (table) => {
    return {
      aswUid: index('asw_uid').on(table.aswUid),
      aswQid: unique('asw_qid').on(table.aswQid, table.aswUid),
    };
  },
);

export const chiiMagiMembers = mysqlTable(
  'chii_magi_members',
  {
    mgmUid: mediumint('mgm_uid').notNull(),
    mgmCorrect: mediumint('mgm_correct').notNull(),
    mgmAnswered: mediumint('mgm_answered').notNull(),
    mgmCreated: mediumint('mgm_created').notNull(),
    mgmRank: mediumint('mgm_rank').notNull(),
  },
  (table) => {
    return {
      mgmUid: index('mgm_uid').on(table.mgmUid, table.mgmRank),
      mgmAnswered: index('mgm_answered').on(table.mgmUid, table.mgmCorrect, table.mgmAnswered),
      mgmCreated: index('mgm_created').on(table.mgmCreated),
    };
  },
);

export const chiiMagiQuestions = mysqlTable(
  'chii_magi_questions',
  {
    qstId: mediumint('qst_id').autoincrement().notNull(),
    qstType: tinyint('qst_type').notNull(),
    qstContent: mediumtext('qst_content').notNull(),
    qstOptions: mediumtext('qst_options').notNull(),
    qstAnswer: tinyint('qst_answer').notNull(),
    qstRelateType: tinyint('qst_relate_type').notNull(),
    qstRelated: mediumint('qst_related').notNull(),
    qstCorrect: mediumint('qst_correct').notNull(),
    qstAnswered: mediumint('qst_answered').notNull(),
    qstCreator: mediumint('qst_creator').notNull(),
    qstDateline: int('qst_dateline').notNull(),
    qstBan: tinyint('qst_ban').default(0).notNull(),
  },
  (table) => {
    return {
      qstType: index('qst_type').on(table.qstType),
      related: index('related').on(table.qstRelateType, table.qstRelated),
      qstBan: index('qst_ban').on(table.qstBan),
    };
  },
);

export const chiiMemberfields = mysqlTable('chii_memberfields', {
  uid: mediumint('uid').notNull(),
  site: varchar('site', { length: 75 }).default('').notNull(),
  location: varchar('location', { length: 30 }).default('').notNull(),
  bio: text('bio').notNull(),
  homepage: mediumtext('homepage').notNull(),
  indexSort: mediumtext('index_sort').notNull(),
  userAgent: varchar('user_agent', { length: 255 }).notNull(),
  ignorepm: text('ignorepm').notNull(),
  groupterms: text('groupterms').notNull(),
  authstr: varchar('authstr', { length: 20 }).default('').notNull(),
  privacy: mediumtext('privacy').notNull(),
  blocklist: mediumtext('blocklist').notNull(),
  regSource: tinyint('reg_source').notNull(),
  inviteNum: tinyint('invite_num').default(0).notNull(),
  emailVerified: tinyint('email_verified').default(0).notNull(),
  emailVerifyToken: varchar('email_verify_token', { length: 255 }).notNull(),
  emailVerifyScore: float('email_verify_score').notNull(),
  emailVerifyDateline: int('email_verify_dateline').notNull(),
  resetPasswordForce: tinyint('reset_password_force').notNull(),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }).notNull(),
  resetPasswordDateline: int('reset_password_dateline').notNull(),
});

export const chiiMembers = mysqlTable(
  'chii_members',
  {
    uid: mediumint('uid').autoincrement().notNull(),
    username: char('username', { length: 15 }).default('').notNull(),
    nickname: varchar('nickname', { length: 30 }).notNull(),
    passwordCrypt: char('password_crypt', { length: 64 }).notNull(),
    avatar: varchar('avatar', { length: 255 }).notNull(),
    secques: char('secques', { length: 8 }).default('').notNull(),
    gender: tinyint('gender').default(0).notNull(),
    adminid: tinyint('adminid').default(0).notNull(),
    groupid: smallint('groupid').notNull(),
    regip: char('regip', { length: 15 }).default('').notNull(),
    regdate: int('regdate').default(0).notNull(),
    lastip: char('lastip', { length: 15 }).default('').notNull(),
    lastvisit: int('lastvisit').default(0).notNull(),
    lastactivity: int('lastactivity').default(0).notNull(),
    lastpost: int('lastpost').default(0).notNull(),
    email: char('email', { length: 50 }).default('').notNull(),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    bday: date('bday', { mode: 'string' }).default('0000-00-00').notNull(),
    styleid: smallint('styleid').notNull(),
    dateformat: char('dateformat', { length: 10 }).default('').notNull(),
    timeformat: tinyint('timeformat').default(0).notNull(),
    newsletter: tinyint('newsletter').default(0).notNull(),
    timeoffset: char('timeoffset', { length: 4 }).default('').notNull(),
    newpm: tinyint('newpm').default(0).notNull(),
    newNotify: smallint('new_notify').notNull(),
    usernameLock: tinyint('username_lock').default(0).notNull(),
    ukagakaSettings: varchar('ukagaka_settings', { length: 255 }).default('0|0|0').notNull(),
    acl: mediumtext('acl').notNull(),
    imgChart: smallint('img_chart').notNull(),
    sign: varchar('sign', { length: 255 }).notNull(),
    invited: tinyint('invited').default(0).notNull(),
  },
  (table) => {
    return {
      email: index('email').on(table.email),
      username: unique('username').on(table.username),
    };
  },
);

export const chiiNetworkServices = mysqlTable(
  'chii_network_services',
  {
    nsUid: mediumint('ns_uid').notNull(),
    nsServiceId: tinyint('ns_service_id').notNull(),
    nsAccount: varchar('ns_account', { length: 255 }).notNull(),
    nsDateline: int('ns_dateline').notNull(),
  },
  (table) => {
    return {
      nsUid2: index('ns_uid_2').on(table.nsUid),
      nsUid: unique('ns_uid').on(table.nsUid, table.nsServiceId),
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
      ntUid: index('nt_uid').on(table.ntUid, table.ntStatus, table.ntType, table.ntRelatedId),
      ntMid: index('nt_mid').on(table.ntMid),
      ntFromUid: index('nt_from_uid').on(table.ntFromUid),
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
      ntfRid: index('ntf_rid').on(table.ntfRid),
      ntfHash: index('ntf_hash').on(table.ntfHash),
    };
  },
);

export const chiiOauthAccessTokens = mysqlTable(
  'chii_oauth_access_tokens',
  {
    id: mediumint('id').autoincrement().notNull(),
    type: tinyint('type').default(0).notNull(),
    accessToken: varchar('access_token', { length: 40 }).notNull(),
    clientId: varchar('client_id', { length: 80 }).notNull(),
    userId: varchar('user_id', { length: 80 }),
    expires: timestamp('expires', { mode: 'string' })
      .default('CURRENT_TIMESTAMP')
      .onUpdateNow()
      .notNull(),
    scope: varchar('scope', { length: 4000 }),
    info: varchar('info', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      type: index('type').on(table.type),
      userExpires: index('user_expires').on(table.userId, table.expires),
      accessToken: unique('access_token').on(table.accessToken),
    };
  },
);

export const chiiOauthAuthorizationCodes = mysqlTable('chii_oauth_authorization_codes', {
  authorizationCode: varchar('authorization_code', { length: 40 }).notNull(),
  clientId: varchar('client_id', { length: 80 }).notNull(),
  userId: varchar('user_id', { length: 80 }),
  redirectUri: varchar('redirect_uri', { length: 2000 }),
  expires: timestamp('expires', { mode: 'string' })
    .default('CURRENT_TIMESTAMP')
    .onUpdateNow()
    .notNull(),
  scope: varchar('scope', { length: 4000 }),
  idToken: varchar('id_token', { length: 1000 }),
});

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

export const chiiOauthJwt = mysqlTable('chii_oauth_jwt', {
  clientId: varchar('client_id', { length: 80 }).notNull(),
  subject: varchar('subject', { length: 80 }),
  publicKey: varchar('public_key', { length: 2000 }).notNull(),
});

export const chiiOauthRefreshTokens = mysqlTable('chii_oauth_refresh_tokens', {
  refreshToken: varchar('refresh_token', { length: 40 }).notNull(),
  clientId: varchar('client_id', { length: 80 }).notNull(),
  userId: varchar('user_id', { length: 80 }),
  expires: timestamp('expires', { mode: 'string' })
    .default('CURRENT_TIMESTAMP')
    .onUpdateNow()
    .notNull(),
  scope: varchar('scope', { length: 4000 }),
});

export const chiiOauthScopes = mysqlTable('chii_oauth_scopes', {
  scope: varchar('scope', { length: 80 }).notNull(),
  isDefault: tinyint('is_default'),
});

export const chiiOnlinetime = mysqlTable('chii_onlinetime', {
  uid: mediumint('uid').notNull(),
  thismonth: smallint('thismonth').notNull(),
  total: mediumint('total').notNull(),
  lastupdate: int('lastupdate').default(0).notNull(),
});

export const chiiOsWebSessions = mysqlTable('chii_os_web_sessions', {
  key: char('key', { length: 64 }).notNull(),
  userId: int('user_id').notNull(),
  // Warning: Can't parse mediumblob from database
  // mediumblobType: mediumblob("value").notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiredAt: bigint('expired_at', { mode: 'number' }).notNull(),
});

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
    birthYear: smallint('birth_year').notNull(),
    birthMon: tinyint('birth_mon').notNull(),
    birthDay: tinyint('birth_day').notNull(),
  },
  (table) => {
    return {
      prsnId: index('prsn_id').on(table.prsnId),
      gender: index('gender').on(table.gender),
      bloodtype: index('bloodtype').on(table.bloodtype),
      birthYear: index('birth_year').on(table.birthYear),
      birthMon: index('birth_mon').on(table.birthMon),
      birthDay: index('birth_day').on(table.birthDay),
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
      msgtoid: index('msgtoid').on(table.msgRid, table.msgFolder, table.msgDateline),
      msgfromid: index('msgfromid').on(table.msgSid, table.msgFolder, table.msgDateline),
      pmRelated: index('pm_related').on(table.msgRelated),
      msgSdeleted: index('msg_sdeleted').on(table.msgSdeleted, table.msgRdeleted),
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
    prsnPstState: tinyint('prsn_pst_state').notNull(),
  },
  (table) => {
    return {
      cmtPrsnId: index('cmt_prsn_id').on(table.prsnPstMid),
      prsnPstRelated: index('prsn_pst_related').on(table.prsnPstRelated),
      prsnPstUid: index('prsn_pst_uid').on(table.prsnPstUid),
    };
  },
);

export const chiiRegips = mysqlTable(
  'chii_regips',
  {
    ip: char('ip', { length: 15 }).default('').notNull(),
    dateline: int('dateline').default(0).notNull(),
    count: smallint('count').notNull(),
  },
  (table) => {
    return {
      ip: index('ip').on(table.ip),
    };
  },
);

export const chiiResources = mysqlTable(
  'chii_resources',
  {
    resId: mediumint('res_id').autoincrement().notNull(),
    resEid: mediumint('res_eid').notNull(),
    resType: tinyint('res_type').default(0).notNull(),
    resTool: tinyint('res_tool').default(0).notNull(),
    resUrl: mediumtext('res_url').notNull(),
    resExt: varchar('res_ext', { length: 5 }).notNull(),
    resAudioLang: tinyint('res_audio_lang').default(0).notNull(),
    resSubLang: tinyint('res_sub_lang').default(0).notNull(),
    resQuality: tinyint('res_quality').default(0).notNull(),
    resSource: mediumtext('res_source').notNull(),
    resVersion: tinyint('res_version').notNull(),
    resCreator: mediumint('res_creator').notNull(),
    resDateline: int('res_dateline').notNull(),
  },
  (table) => {
    return {
      resEid: index('res_eid').on(table.resEid, table.resType),
      resTool: index('res_tool').on(table.resTool),
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

export const chiiRobotPersonality = mysqlTable(
  'chii_robot_personality',
  {
    rbtPsnId: mediumint('rbt_psn_id').autoincrement().notNull(),
    rbtPsnName: varchar('rbt_psn_name', { length: 255 }).notNull(),
    rbtPsnCreator: mediumint('rbt_psn_creator').notNull(),
    rbtPsnDesc: mediumtext('rbt_psn_desc').notNull(),
    rbtPsnSpeech: mediumint('rbt_psn_speech').notNull(),
    rbtPsnBan: tinyint('rbt_psn_ban').default(0).notNull(),
    rbtPsnLasttouch: int('rbt_psn_lasttouch').notNull(),
    rbtPsnDateline: int('rbt_psn_dateline').notNull(),
  },
  (table) => {
    return {
      rbtPsnBan: index('rbt_psn_ban').on(table.rbtPsnBan),
    };
  },
);

export const chiiRobotSpeech = mysqlTable(
  'chii_robot_speech',
  {
    rbtSpcId: mediumint('rbt_spc_id').autoincrement().notNull(),
    rbtSpcMid: mediumint('rbt_spc_mid').notNull(),
    rbtSpcUid: mediumint('rbt_spc_uid').notNull(),
    rbtSpcSpeech: varchar('rbt_spc_speech', { length: 255 }).notNull(),
    rbtSpcBan: tinyint('rbt_spc_ban').default(0).notNull(),
    rbtSpcDateline: int('rbt_spc_dateline').notNull(),
  },
  (table) => {
    return {
      rbtSpcMid: index('rbt_spc_mid').on(table.rbtSpcMid),
      rbtSpcBan: index('rbt_spc_ban').on(table.rbtSpcBan),
    };
  },
);

export const chiiSearchindex = mysqlTable(
  'chii_searchindex',
  {
    keywords: varchar('keywords', { length: 255 }).default('').notNull(),
    searchstring: varchar('searchstring', { length: 255 }).default('').notNull(),
    dateline: int('dateline').default(0).notNull(),
    expiration: int('expiration').default(0).notNull(),
    threads: smallint('threads').notNull(),
    tids: text('tids').notNull(),
    type: varchar('type', { length: 255 }).notNull(),
  },
  (table) => {
    return {
      searchstring: index('searchstring').on(table.searchstring),
    };
  },
);

export const chiiSessions = mysqlTable(
  'chii_sessions',
  {
    sid: char('sid', { length: 6 }).default('').notNull(),
    ip1: tinyint('ip1').default(0).notNull(),
    ip2: tinyint('ip2').default(0).notNull(),
    ip3: tinyint('ip3').default(0).notNull(),
    ip4: tinyint('ip4').default(0).notNull(),
    uid: mediumint('uid').notNull(),
    username: char('username', { length: 15 }).default('').notNull(),
    groupid: smallint('groupid').notNull(),
    styleid: smallint('styleid').notNull(),
    invisible: tinyint('invisible').default(0).notNull(),
    action: tinyint('action').default(0).notNull(),
    lastactivity: int('lastactivity').default(0).notNull(),
    lastolupdate: int('lastolupdate').default(0).notNull(),
    pageviews: smallint('pageviews').notNull(),
    seccode: mediumint('seccode').notNull(),
    fid: smallint('fid').notNull(),
    tid: mediumint('tid').notNull(),
    bloguid: mediumint('bloguid').notNull(),
  },
  (table) => {
    return {
      uid: index('uid').on(table.uid),
      bloguid: index('bloguid').on(table.bloguid),
      ip: index('ip').on(table.ip1, table.ip2, table.ip3, table.ip4),
      lastactivity: index('lastactivity').on(table.lastactivity),
      sid: unique('sid').on(table.sid),
    };
  },
);

export const chiiSettings = mysqlTable('chii_settings', {
  variable: varchar('variable', { length: 32 }).default('').notNull(),
  value: text('value').notNull(),
});

export const chiiStats = mysqlTable(
  'chii_stats',
  {
    unit: mediumint('unit').notNull(),
    category: mediumint('category').notNull(),
    type: mediumint('type').notNull(),
    subType: mediumint('sub_type').notNull(),
    relatedId: mediumint('related_id').notNull(),
    value: int('value').notNull(),
    timestamp: int('timestamp').notNull(),
    updatedAt: int('updated_at').notNull(),
  },
  (table) => {
    return {
      category: index('category').on(table.category, table.type, table.subType),
      unit: unique('unit').on(table.unit, table.relatedId),
    };
  },
);

export const chiiSubjects = mysqlTable(
  'chii_subjects',
  {
    subjectId: mediumint('subject_id').autoincrement().notNull(),
    subjectTypeId: smallint('subject_type_id').notNull(),
    subjectName: varchar('subject_name', { length: 512 }).notNull(),
    subjectNameCn: varchar('subject_name_cn', { length: 512 }).notNull(),
    subjectUid: varchar('subject_uid', { length: 20 }).notNull(),
    subjectCreator: mediumint('subject_creator').notNull(),
    subjectDateline: int('subject_dateline').default(0).notNull(),
    subjectImage: varchar('subject_image', { length: 255 }).notNull(),
    subjectPlatform: smallint('subject_platform').notNull(),
    fieldInfobox: mediumtext('field_infobox').notNull(),
    fieldMetaTags: mediumtext('field_meta_tags').notNull(),
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

export const chiiSubjects240921 = mysqlTable(
  'chii_subjects_240921',
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
    fieldYear: smallint('field_year').notNull(),
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
      interestSubjectId: index('interest_subject_id').on(
        table.interestSubjectId,
        table.interestType,
      ),
      interestUid: index('interest_uid').on(table.interestUid),
      interestCollectDateline: index('interest_collect_dateline').on(table.interestCollectDateline),
      interestPrivate: index('interest_private').on(table.interestPrivate),
      interestLasttouch: index('interest_lasttouch').on(table.interestLasttouch),
      interestSubjectId2: index('interest_subject_id_2').on(table.interestSubjectId),
      interestType: index('interest_type').on(table.interestType),
      interestSubjectType: index('interest_subject_type').on(table.interestSubjectType),
      interestRate: index('interest_rate').on(table.interestRate),
      tagSubjectId: index('tag_subject_id').on(
        table.interestSubjectType,
        table.interestType,
        table.interestUid,
      ),
      userCollects: index('user_collects').on(table.interestSubjectType, table.interestUid),
      subjectLasttouch: index('subject_lasttouch').on(
        table.interestSubjectId,
        table.interestPrivate,
        table.interestLasttouch,
      ),
      subjectComment: index('subject_comment').on(
        table.interestSubjectId,
        table.interestHasComment,
        table.interestPrivate,
        table.interestLasttouch,
      ),
      subjectCollect: index('subject_collect').on(
        table.interestSubjectId,
        table.interestType,
        table.interestPrivate,
        table.interestCollectDateline,
      ),
      userCollectType: index('user_collect_type').on(
        table.interestSubjectType,
        table.interestType,
        table.interestUid,
        table.interestPrivate,
        table.interestCollectDateline,
      ),
      interestId: index('interest_id').on(table.interestUid, table.interestPrivate),
      subjectRate: index('subject_rate').on(
        table.interestSubjectId,
        table.interestRate,
        table.interestPrivate,
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
      interestType2: index('interest_type_2').on(table.interestType, table.interestUid),
      interestUid2: index('interest_uid_2').on(
        table.interestUid,
        table.interestPrivate,
        table.interestLasttouch,
      ),
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

export const chiiSubjectRec2 = mysqlTable(
  'chii_subject_rec_2',
  {
    subjectId: mediumint('subject_id').notNull(),
    recSubjectId: mediumint('rec_subject_id').notNull(),
    mioSim: float('mio_sim').notNull(),
    mioCount: mediumint('mio_count').notNull(),
  },
  (table) => {
    return {
      subject1Id: index('subject1_id').on(table.subjectId),
    };
  },
);

export const chiiSubjectRelatedBlog = mysqlTable(
  'chii_subject_related_blog',
  {
    srbId: mediumint('srb_id').autoincrement().notNull(),
    srbUid: mediumint('srb_uid').notNull(),
    srbSubjectId: mediumint('srb_subject_id').notNull(),
    srbEntryId: mediumint('srb_entry_id').notNull(),
    srbSpoiler: mediumint('srb_spoiler').notNull(),
    srbLike: mediumint('srb_like').notNull(),
    srbDislike: mediumint('srb_dislike').notNull(),
    srbDateline: int('srb_dateline').notNull(),
  },
  (table) => {
    return {
      srbUid: index('srb_uid').on(table.srbUid, table.srbSubjectId, table.srbEntryId),
      subjectRelated: index('subject_related').on(table.srbSubjectId),
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
    rltOrder: smallint('rlt_order').notNull(),
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

export const chiiSubjectRelationsBak240803 = mysqlTable(
  'chii_subject_relations_bak_240803',
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
    revFieldMetaTags: mediumtext('rev_field_meta_tags').notNull(),
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

export const chiiTagIndex = mysqlTable(
  'chii_tag_index',
  {
    tagId: mediumint('tag_id').autoincrement().notNull(),
    tagName: varchar('tag_name', { length: 30 }).notNull(),
    tagTypeId: smallint('tag_type_id').notNull(),
    tagResult: mediumint('tag_result').notNull(),
    tagDateline: int('tag_dateline').notNull(),
    tagLasttouch: int('tag_lasttouch').notNull(),
  },
  (table) => {
    return {
      tagTypeId: index('tag_type_id').on(table.tagTypeId),
    };
  },
);

export const chiiTagList = mysqlTable(
  'chii_tag_list',
  {
    tltTid: mediumint('tlt_tid').notNull(),
    tltUid: mediumint('tlt_uid').notNull(),
    tltCid: tinyint('tlt_cid').default(0).notNull(),
    tltSid: mediumint('tlt_sid').notNull(),
    tagDateline: int('tag_dateline').notNull(),
  },
  (table) => {
    return {
      tltTid: index('tlt_tid').on(table.tltTid, table.tltUid, table.tltSid),
      tltCid: index('tlt_cid').on(table.tltCid),
    };
  },
);

export const chiiTagNeueFields = mysqlTable('chii_tag_neue_fields', {
  fieldTid: int('field_tid').notNull(),
  fieldSummary: mediumtext('field_summary').notNull(),
  fieldOrder: mediumint('field_order').notNull(),
  fieldNsfw: tinyint('field_nsfw').default(0).notNull(),
  fieldLock: int('field_lock').default(0).notNull(),
});

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
      tmlCatDate: index('tml_cat_date').on(table.tmlUid, table.tmlCat, table.tmlDateline),
    };
  },
);

export const chiiTimelineComments = mysqlTable(
  'chii_timeline_comments',
  {
    tmlPstId: mediumint('tml_pst_id').autoincrement().notNull(),
    tmlPstMid: int('tml_pst_mid').notNull(),
    tmlPstUid: mediumint('tml_pst_uid').notNull(),
    tmlPstRelated: mediumint('tml_pst_related').notNull(),
    tmlPstDateline: int('tml_pst_dateline').notNull(),
    tmlPstContent: mediumtext('tml_pst_content').notNull(),
  },
  (table) => {
    return {
      cmtTmlId: index('cmt_tml_id').on(table.tmlPstMid),
      tmlPstRelated: index('tml_pst_related').on(table.tmlPstRelated),
      tmlPstUid: index('tml_pst_uid').on(table.tmlPstUid),
    };
  },
);

export const chiiTokeiPaint = mysqlTable(
  'chii_tokei_paint',
  {
    tpId: mediumint('tp_id').autoincrement().notNull(),
    tpUid: mediumint('tp_uid').notNull(),
    tpHour: tinyint('tp_hour').notNull(),
    tpMin: tinyint('tp_min').notNull(),
    tpUrl: varchar('tp_url', { length: 255 }).notNull(),
    tpDesc: mediumtext('tp_desc').notNull(),
    tpBook: tinyint('tp_book').default(0).notNull(),
    tpViews: mediumint('tp_views').notNull(),
    tpRelatedTpc: mediumint('tp_related_tpc').notNull(),
    tpLastupdate: int('tp_lastupdate').notNull(),
    tpDateline: int('tp_dateline').notNull(),
  },
  (table) => {
    return {
      tpUid: index('tp_uid').on(table.tpUid, table.tpHour),
      tpRelatedTpc: index('tp_related_tpc').on(table.tpRelatedTpc),
    };
  },
);

export const chiiUsergroup = mysqlTable('chii_usergroup', {
  usrGrpId: mediumint('usr_grp_id').autoincrement().notNull(),
  usrGrpName: varchar('usr_grp_name', { length: 255 }).notNull(),
  usrGrpPerm: mediumtext('usr_grp_perm').notNull(),
  usrGrpDateline: int('usr_grp_dateline').notNull(),
});
