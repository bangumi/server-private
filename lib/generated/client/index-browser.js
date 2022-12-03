
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum
} = require('./runtime/index-browser')


const Prisma = {}

exports.Prisma = Prisma

/**
 * Prisma Client JS version: 4.7.1
 * Query Engine version: 272861e07ab64f234d3ffc4094e32bd61775599c
 */
Prisma.prismaVersion = {
  client: "4.7.1",
  engine: "272861e07ab64f234d3ffc4094e32bd61775599c"
}

Prisma.PrismaClientKnownRequestError = () => {
  throw new Error(`PrismaClientKnownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  throw new Error(`PrismaClientUnknownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientRustPanicError = () => {
  throw new Error(`PrismaClientRustPanicError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientInitializationError = () => {
  throw new Error(`PrismaClientInitializationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientValidationError = () => {
  throw new Error(`PrismaClientValidationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.NotFoundError = () => {
  throw new Error(`NotFoundError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  throw new Error(`sqltag is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.empty = () => {
  throw new Error(`empty is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.join = () => {
  throw new Error(`join is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.raw = () => {
  throw new Error(`raw is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.validator = () => (val) => val


/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */
// Based on
// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
function makeEnum(x) { return x; }

exports.Prisma.Chii_appsScalarFieldEnum = makeEnum({
  app_id: 'app_id',
  app_type: 'app_type',
  app_creator: 'app_creator',
  app_name: 'app_name',
  app_desc: 'app_desc',
  app_url: 'app_url',
  app_collects: 'app_collects',
  app_status: 'app_status',
  app_timestamp: 'app_timestamp',
  app_lasttouch: 'app_lasttouch',
  app_ban: 'app_ban'
});

exports.Prisma.Chii_charactersScalarFieldEnum = makeEnum({
  crt_id: 'crt_id',
  crt_name: 'crt_name',
  crt_role: 'crt_role',
  crt_infobox: 'crt_infobox',
  crt_summary: 'crt_summary',
  crt_img: 'crt_img',
  crt_comment: 'crt_comment',
  crt_collects: 'crt_collects',
  crt_dateline: 'crt_dateline',
  crt_lastpost: 'crt_lastpost',
  crt_lock: 'crt_lock',
  crt_img_anidb: 'crt_img_anidb',
  crt_anidb_id: 'crt_anidb_id',
  crt_ban: 'crt_ban',
  crt_redirect: 'crt_redirect',
  crt_nsfw: 'crt_nsfw'
});

exports.Prisma.Chii_crt_cast_indexScalarFieldEnum = makeEnum({
  crt_id: 'crt_id',
  prsn_id: 'prsn_id',
  subject_id: 'subject_id',
  subject_type_id: 'subject_type_id',
  summary: 'summary'
});

exports.Prisma.Chii_crt_commentsScalarFieldEnum = makeEnum({
  crt_pst_id: 'crt_pst_id',
  crt_pst_mid: 'crt_pst_mid',
  crt_pst_uid: 'crt_pst_uid',
  crt_pst_related: 'crt_pst_related',
  crt_pst_dateline: 'crt_pst_dateline',
  crt_pst_content: 'crt_pst_content'
});

exports.Prisma.Chii_crt_subject_indexScalarFieldEnum = makeEnum({
  crt_id: 'crt_id',
  subject_id: 'subject_id',
  subject_type_id: 'subject_type_id',
  crt_type: 'crt_type',
  ctr_appear_eps: 'ctr_appear_eps',
  crt_order: 'crt_order'
});

exports.Prisma.Chii_ep_commentsScalarFieldEnum = makeEnum({
  ep_pst_id: 'ep_pst_id',
  ep_pst_mid: 'ep_pst_mid',
  ep_pst_uid: 'ep_pst_uid',
  ep_pst_related: 'ep_pst_related',
  ep_pst_dateline: 'ep_pst_dateline',
  ep_pst_content: 'ep_pst_content'
});

exports.Prisma.Chii_ep_revisionsScalarFieldEnum = makeEnum({
  ep_rev_id: 'ep_rev_id',
  rev_sid: 'rev_sid',
  rev_eids: 'rev_eids',
  rev_ep_infobox: 'rev_ep_infobox',
  rev_creator: 'rev_creator',
  rev_version: 'rev_version',
  rev_dateline: 'rev_dateline',
  rev_edit_summary: 'rev_edit_summary'
});

exports.Prisma.Chii_ep_statusScalarFieldEnum = makeEnum({
  ep_stt_id: 'ep_stt_id',
  ep_stt_uid: 'ep_stt_uid',
  ep_stt_sid: 'ep_stt_sid',
  ep_stt_on_prg: 'ep_stt_on_prg',
  ep_stt_status: 'ep_stt_status',
  ep_stt_lasttouch: 'ep_stt_lasttouch'
});

exports.Prisma.Chii_episodesScalarFieldEnum = makeEnum({
  ep_id: 'ep_id',
  ep_subject_id: 'ep_subject_id',
  ep_sort: 'ep_sort',
  ep_type: 'ep_type',
  ep_disc: 'ep_disc',
  ep_name: 'ep_name',
  ep_name_cn: 'ep_name_cn',
  ep_rate: 'ep_rate',
  ep_duration: 'ep_duration',
  ep_airdate: 'ep_airdate',
  ep_online: 'ep_online',
  ep_comment: 'ep_comment',
  ep_resources: 'ep_resources',
  ep_desc: 'ep_desc',
  ep_dateline: 'ep_dateline',
  ep_lastpost: 'ep_lastpost',
  ep_lock: 'ep_lock',
  ep_ban: 'ep_ban'
});

exports.Prisma.Chii_group_membersScalarFieldEnum = makeEnum({
  gmb_uid: 'gmb_uid',
  gmb_gid: 'gmb_gid',
  gmb_moderator: 'gmb_moderator',
  gmb_dateline: 'gmb_dateline'
});

exports.Prisma.Chii_group_postsScalarFieldEnum = makeEnum({
  grp_pst_id: 'grp_pst_id',
  grp_pst_mid: 'grp_pst_mid',
  grp_pst_uid: 'grp_pst_uid',
  grp_pst_related: 'grp_pst_related',
  grp_pst_content: 'grp_pst_content',
  grp_pst_state: 'grp_pst_state',
  grp_pst_dateline: 'grp_pst_dateline'
});

exports.Prisma.Chii_group_topicsScalarFieldEnum = makeEnum({
  grp_tpc_id: 'grp_tpc_id',
  grp_tpc_gid: 'grp_tpc_gid',
  grp_tpc_uid: 'grp_tpc_uid',
  grp_tpc_title: 'grp_tpc_title',
  grp_tpc_dateline: 'grp_tpc_dateline',
  grp_tpc_lastpost: 'grp_tpc_lastpost',
  grp_tpc_replies: 'grp_tpc_replies',
  grp_tpc_state: 'grp_tpc_state',
  grp_tpc_display: 'grp_tpc_display'
});

exports.Prisma.Chii_groupsScalarFieldEnum = makeEnum({
  grp_id: 'grp_id',
  grp_cat: 'grp_cat',
  grp_name: 'grp_name',
  grp_title: 'grp_title',
  grp_icon: 'grp_icon',
  grp_creator: 'grp_creator',
  grp_topics: 'grp_topics',
  grp_posts: 'grp_posts',
  grp_members: 'grp_members',
  grp_desc: 'grp_desc',
  grp_lastpost: 'grp_lastpost',
  grp_builddate: 'grp_builddate',
  grp_accessible: 'grp_accessible',
  grp_nsfw: 'grp_nsfw'
});

exports.Prisma.Chii_indexScalarFieldEnum = makeEnum({
  idx_id: 'idx_id',
  idx_type: 'idx_type',
  idx_title: 'idx_title',
  idx_desc: 'idx_desc',
  idx_replies: 'idx_replies',
  idx_subject_total: 'idx_subject_total',
  idx_collects: 'idx_collects',
  idx_stats: 'idx_stats',
  idx_dateline: 'idx_dateline',
  idx_lasttouch: 'idx_lasttouch',
  idx_uid: 'idx_uid',
  idx_ban: 'idx_ban'
});

exports.Prisma.Chii_index_collectsScalarFieldEnum = makeEnum({
  idx_clt_id: 'idx_clt_id',
  idx_clt_mid: 'idx_clt_mid',
  idx_clt_uid: 'idx_clt_uid',
  idx_clt_dateline: 'idx_clt_dateline'
});

exports.Prisma.Chii_index_commentsScalarFieldEnum = makeEnum({
  idx_pst_id: 'idx_pst_id',
  idx_pst_mid: 'idx_pst_mid',
  idx_pst_uid: 'idx_pst_uid',
  idx_pst_related: 'idx_pst_related',
  idx_pst_dateline: 'idx_pst_dateline',
  idx_pst_content: 'idx_pst_content'
});

exports.Prisma.Chii_index_relatedScalarFieldEnum = makeEnum({
  idx_rlt_id: 'idx_rlt_id',
  idx_rlt_cat: 'idx_rlt_cat',
  idx_rlt_rid: 'idx_rlt_rid',
  idx_rlt_type: 'idx_rlt_type',
  idx_rlt_sid: 'idx_rlt_sid',
  idx_rlt_order: 'idx_rlt_order',
  idx_rlt_comment: 'idx_rlt_comment',
  idx_rlt_dateline: 'idx_rlt_dateline'
});

exports.Prisma.Chii_memberfieldsScalarFieldEnum = makeEnum({
  uid: 'uid',
  site: 'site',
  location: 'location',
  bio: 'bio',
  privacy: 'privacy',
  blocklist: 'blocklist'
});

exports.Prisma.Chii_membersScalarFieldEnum = makeEnum({
  uid: 'uid',
  username: 'username',
  nickname: 'nickname',
  avatar: 'avatar',
  groupid: 'groupid',
  regdate: 'regdate',
  lastvisit: 'lastvisit',
  lastactivity: 'lastactivity',
  lastpost: 'lastpost',
  dateformat: 'dateformat',
  timeformat: 'timeformat',
  timeoffset: 'timeoffset',
  newpm: 'newpm',
  new_notify: 'new_notify',
  sign: 'sign',
  password_crypt: 'password_crypt',
  email: 'email'
});

exports.Prisma.Chii_oauth_access_tokensScalarFieldEnum = makeEnum({
  id: 'id',
  type: 'type',
  access_token: 'access_token',
  client_id: 'client_id',
  user_id: 'user_id',
  expires: 'expires',
  scope: 'scope',
  info: 'info'
});

exports.Prisma.Chii_oauth_clientsScalarFieldEnum = makeEnum({
  app_id: 'app_id',
  client_id: 'client_id',
  client_secret: 'client_secret',
  redirect_uri: 'redirect_uri',
  grant_types: 'grant_types',
  scope: 'scope',
  user_id: 'user_id'
});

exports.Prisma.Chii_os_web_sessionsScalarFieldEnum = makeEnum({
  key: 'key',
  user_id: 'user_id',
  value: 'value',
  created_at: 'created_at',
  expired_at: 'expired_at'
});

exports.Prisma.Chii_person_collectsScalarFieldEnum = makeEnum({
  prsn_clt_id: 'prsn_clt_id',
  prsn_clt_cat: 'prsn_clt_cat',
  prsn_clt_mid: 'prsn_clt_mid',
  prsn_clt_uid: 'prsn_clt_uid',
  prsn_clt_dateline: 'prsn_clt_dateline'
});

exports.Prisma.Chii_person_cs_indexScalarFieldEnum = makeEnum({
  prsn_type: 'prsn_type',
  prsn_id: 'prsn_id',
  prsn_position: 'prsn_position',
  subject_id: 'subject_id',
  subject_type_id: 'subject_type_id',
  summary: 'summary',
  prsn_appear_eps: 'prsn_appear_eps'
});

exports.Prisma.Chii_person_fieldsScalarFieldEnum = makeEnum({
  prsn_cat: 'prsn_cat',
  prsn_id: 'prsn_id',
  gender: 'gender',
  bloodtype: 'bloodtype',
  birth_year: 'birth_year',
  birth_mon: 'birth_mon',
  birth_day: 'birth_day'
});

exports.Prisma.Chii_personsScalarFieldEnum = makeEnum({
  prsn_id: 'prsn_id',
  prsn_name: 'prsn_name',
  prsn_type: 'prsn_type',
  prsn_infobox: 'prsn_infobox',
  prsn_producer: 'prsn_producer',
  prsn_mangaka: 'prsn_mangaka',
  prsn_artist: 'prsn_artist',
  prsn_seiyu: 'prsn_seiyu',
  prsn_writer: 'prsn_writer',
  prsn_illustrator: 'prsn_illustrator',
  prsn_actor: 'prsn_actor',
  prsn_summary: 'prsn_summary',
  prsn_img: 'prsn_img',
  prsn_img_anidb: 'prsn_img_anidb',
  prsn_comment: 'prsn_comment',
  prsn_collects: 'prsn_collects',
  prsn_dateline: 'prsn_dateline',
  prsn_lastpost: 'prsn_lastpost',
  prsn_lock: 'prsn_lock',
  prsn_anidb_id: 'prsn_anidb_id',
  prsn_ban: 'prsn_ban',
  prsn_redirect: 'prsn_redirect',
  prsn_nsfw: 'prsn_nsfw'
});

exports.Prisma.Chii_prsn_commentsScalarFieldEnum = makeEnum({
  prsn_pst_id: 'prsn_pst_id',
  prsn_pst_mid: 'prsn_pst_mid',
  prsn_pst_uid: 'prsn_pst_uid',
  prsn_pst_related: 'prsn_pst_related',
  prsn_pst_dateline: 'prsn_pst_dateline',
  prsn_pst_content: 'prsn_pst_content'
});

exports.Prisma.Chii_rev_historyScalarFieldEnum = makeEnum({
  rev_id: 'rev_id',
  rev_type: 'rev_type',
  rev_mid: 'rev_mid',
  rev_text_id: 'rev_text_id',
  rev_dateline: 'rev_dateline',
  rev_creator: 'rev_creator',
  rev_edit_summary: 'rev_edit_summary'
});

exports.Prisma.Chii_rev_textScalarFieldEnum = makeEnum({
  rev_text_id: 'rev_text_id',
  rev_text: 'rev_text'
});

exports.Prisma.Chii_subject_fieldsScalarFieldEnum = makeEnum({
  field_sid: 'field_sid',
  field_tid: 'field_tid',
  field_tags: 'field_tags',
  field_rate_1: 'field_rate_1',
  field_rate_2: 'field_rate_2',
  field_rate_3: 'field_rate_3',
  field_rate_4: 'field_rate_4',
  field_rate_5: 'field_rate_5',
  field_rate_6: 'field_rate_6',
  field_rate_7: 'field_rate_7',
  field_rate_8: 'field_rate_8',
  field_rate_9: 'field_rate_9',
  field_rate_10: 'field_rate_10',
  field_airtime: 'field_airtime',
  field_rank: 'field_rank',
  field_year: 'field_year',
  field_mon: 'field_mon',
  field_week_day: 'field_week_day',
  field_date: 'field_date',
  field_redirect: 'field_redirect'
});

exports.Prisma.Chii_subject_interestsScalarFieldEnum = makeEnum({
  interest_id: 'interest_id',
  interest_uid: 'interest_uid',
  interest_subject_id: 'interest_subject_id',
  interest_subject_type: 'interest_subject_type',
  interest_rate: 'interest_rate',
  interest_type: 'interest_type',
  interest_has_comment: 'interest_has_comment',
  interest_comment: 'interest_comment',
  interest_tag: 'interest_tag',
  interest_ep_status: 'interest_ep_status',
  interest_vol_status: 'interest_vol_status',
  interest_wish_dateline: 'interest_wish_dateline',
  interest_doing_dateline: 'interest_doing_dateline',
  interest_collect_dateline: 'interest_collect_dateline',
  interest_on_hold_dateline: 'interest_on_hold_dateline',
  interest_dropped_dateline: 'interest_dropped_dateline',
  interest_create_ip: 'interest_create_ip',
  interest_lasttouch_ip: 'interest_lasttouch_ip',
  interest_lasttouch: 'interest_lasttouch',
  interest_private: 'interest_private'
});

exports.Prisma.Chii_subject_postsScalarFieldEnum = makeEnum({
  sbj_pst_id: 'sbj_pst_id',
  sbj_pst_mid: 'sbj_pst_mid',
  sbj_pst_uid: 'sbj_pst_uid',
  sbj_pst_related: 'sbj_pst_related',
  sbj_pst_content: 'sbj_pst_content',
  sbj_pst_state: 'sbj_pst_state',
  sbj_pst_dateline: 'sbj_pst_dateline'
});

exports.Prisma.Chii_subject_relationsScalarFieldEnum = makeEnum({
  rlt_subject_id: 'rlt_subject_id',
  rlt_subject_type_id: 'rlt_subject_type_id',
  rlt_relation_type: 'rlt_relation_type',
  rlt_related_subject_id: 'rlt_related_subject_id',
  rlt_related_subject_type_id: 'rlt_related_subject_type_id',
  rlt_vice_versa: 'rlt_vice_versa',
  rlt_order: 'rlt_order'
});

exports.Prisma.Chii_subject_revisionsScalarFieldEnum = makeEnum({
  rev_id: 'rev_id',
  rev_type: 'rev_type',
  rev_subject_id: 'rev_subject_id',
  rev_type_id: 'rev_type_id',
  rev_creator: 'rev_creator',
  rev_dateline: 'rev_dateline',
  rev_name: 'rev_name',
  rev_name_cn: 'rev_name_cn',
  rev_field_infobox: 'rev_field_infobox',
  rev_field_summary: 'rev_field_summary',
  rev_vote_field: 'rev_vote_field',
  rev_field_eps: 'rev_field_eps',
  rev_edit_summary: 'rev_edit_summary',
  rev_platform: 'rev_platform'
});

exports.Prisma.Chii_subject_topicsScalarFieldEnum = makeEnum({
  sbj_tpc_id: 'sbj_tpc_id',
  sbj_tpc_subject_id: 'sbj_tpc_subject_id',
  sbj_tpc_uid: 'sbj_tpc_uid',
  sbj_tpc_title: 'sbj_tpc_title',
  sbj_tpc_dateline: 'sbj_tpc_dateline',
  sbj_tpc_lastpost: 'sbj_tpc_lastpost',
  sbj_tpc_replies: 'sbj_tpc_replies',
  sbj_tpc_state: 'sbj_tpc_state',
  sbj_tpc_display: 'sbj_tpc_display'
});

exports.Prisma.Chii_subjectsScalarFieldEnum = makeEnum({
  subject_id: 'subject_id',
  subject_type_id: 'subject_type_id',
  subject_name: 'subject_name',
  subject_name_cn: 'subject_name_cn',
  subject_uid: 'subject_uid',
  subject_creator: 'subject_creator',
  subject_dateline: 'subject_dateline',
  subject_image: 'subject_image',
  subject_platform: 'subject_platform',
  field_infobox: 'field_infobox',
  field_summary: 'field_summary',
  field_5: 'field_5',
  field_volumes: 'field_volumes',
  field_eps: 'field_eps',
  subject_wish: 'subject_wish',
  subject_collect: 'subject_collect',
  subject_doing: 'subject_doing',
  subject_on_hold: 'subject_on_hold',
  subject_dropped: 'subject_dropped',
  subject_series: 'subject_series',
  subject_series_entry: 'subject_series_entry',
  subject_idx_cn: 'subject_idx_cn',
  subject_airtime: 'subject_airtime',
  subject_nsfw: 'subject_nsfw',
  subject_ban: 'subject_ban'
});

exports.Prisma.Chii_timelineScalarFieldEnum = makeEnum({
  tml_id: 'tml_id',
  tml_uid: 'tml_uid',
  tml_cat: 'tml_cat',
  tml_type: 'tml_type',
  tml_related: 'tml_related',
  tml_memo: 'tml_memo',
  tml_img: 'tml_img',
  tml_batch: 'tml_batch',
  tml_source: 'tml_source',
  tml_replies: 'tml_replies',
  tml_dateline: 'tml_dateline',
  tml_status: 'tml_status'
});

exports.Prisma.Chii_usergroupScalarFieldEnum = makeEnum({
  usr_grp_id: 'usr_grp_id',
  usr_grp_name: 'usr_grp_name',
  usr_grp_perm: 'usr_grp_perm',
  usr_grp_dateline: 'usr_grp_dateline'
});

exports.Prisma.ExampleScalarFieldEnum = makeEnum({
  id: 'id',
  time: 'time'
});

exports.Prisma.SortOrder = makeEnum({
  asc: 'asc',
  desc: 'desc'
});

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});
exports.chii_person_collects_prsn_clt_cat = makeEnum({
  prsn: 'prsn',
  crt: 'crt'
});

exports.chii_person_cs_index_prsn_type = makeEnum({
  prsn: 'prsn',
  crt: 'crt'
});

exports.chii_person_fields_prsn_cat = makeEnum({
  prsn: 'prsn',
  crt: 'crt'
});

exports.Prisma.ModelName = makeEnum({
  chii_apps: 'chii_apps',
  chii_characters: 'chii_characters',
  chii_crt_cast_index: 'chii_crt_cast_index',
  chii_crt_comments: 'chii_crt_comments',
  chii_crt_subject_index: 'chii_crt_subject_index',
  chii_ep_comments: 'chii_ep_comments',
  chii_ep_revisions: 'chii_ep_revisions',
  chii_ep_status: 'chii_ep_status',
  chii_episodes: 'chii_episodes',
  chii_group_members: 'chii_group_members',
  chii_group_posts: 'chii_group_posts',
  chii_group_topics: 'chii_group_topics',
  chii_groups: 'chii_groups',
  chii_index: 'chii_index',
  chii_index_collects: 'chii_index_collects',
  chii_index_comments: 'chii_index_comments',
  chii_index_related: 'chii_index_related',
  chii_memberfields: 'chii_memberfields',
  chii_members: 'chii_members',
  chii_oauth_access_tokens: 'chii_oauth_access_tokens',
  chii_oauth_clients: 'chii_oauth_clients',
  chii_os_web_sessions: 'chii_os_web_sessions',
  chii_person_collects: 'chii_person_collects',
  chii_person_cs_index: 'chii_person_cs_index',
  chii_person_fields: 'chii_person_fields',
  chii_persons: 'chii_persons',
  chii_prsn_comments: 'chii_prsn_comments',
  chii_rev_history: 'chii_rev_history',
  chii_rev_text: 'chii_rev_text',
  chii_subject_fields: 'chii_subject_fields',
  chii_subject_interests: 'chii_subject_interests',
  chii_subject_posts: 'chii_subject_posts',
  chii_subject_relations: 'chii_subject_relations',
  chii_subject_revisions: 'chii_subject_revisions',
  chii_subject_topics: 'chii_subject_topics',
  chii_subjects: 'chii_subjects',
  chii_timeline: 'chii_timeline',
  chii_usergroup: 'chii_usergroup',
  example: 'example'
});

/**
 * Create the Client
 */
class PrismaClient {
  constructor() {
    throw new Error(
      `PrismaClient is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
    )
  }
}
exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
