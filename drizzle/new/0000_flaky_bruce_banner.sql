-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `chii_apps` (
	`app_id` mediumint(8) AUTO_INCREMENT NOT NULL,
	`app_type` tinyint NOT NULL,
	`app_creator` mediumint(8) NOT NULL,
	`app_name` varchar(255) NOT NULL,
	`app_desc` mediumtext NOT NULL,
	`app_url` varchar(2000) NOT NULL,
	`app_is_third_party` tinyint NOT NULL,
	`app_collects` mediumint(8) NOT NULL,
	`app_status` tinyint NOT NULL,
	`app_timestamp` int(10) NOT NULL,
	`app_lasttouch` int(10) NOT NULL,
	`app_ban` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_app_collects` (
	`app_clt_id` mediumint(8) AUTO_INCREMENT NOT NULL,
	`app_clt_app_id` mediumint(8) NOT NULL,
	`app_clt_uid` mediumint(8) NOT NULL,
	`app_clt_dateline` int(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_blog_comments` (
	`blg_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`blg_pst_mid` mediumint(8) unsigned NOT NULL,
	`blg_pst_uid` mediumint(8) unsigned NOT NULL,
	`blg_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`blg_pst_dateline` int(10) unsigned NOT NULL,
	`blg_pst_content` mediumtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_blog_entry` (
	`entry_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`entry_type` smallint(6) unsigned NOT NULL,
	`entry_uid` mediumint(8) unsigned NOT NULL,
	`entry_title` varchar(80) NOT NULL,
	`entry_icon` varchar(255) NOT NULL,
	`entry_content` mediumtext NOT NULL,
	`entry_tags` mediumtext NOT NULL,
	`entry_views` mediumint(8) unsigned NOT NULL,
	`entry_replies` mediumint(8) unsigned NOT NULL,
	`entry_dateline` int(10) unsigned NOT NULL,
	`entry_lastpost` int(10) unsigned NOT NULL,
	`entry_like` int(8) unsigned NOT NULL,
	`entry_dislike` int(8) unsigned NOT NULL,
	`entry_noreply` smallint(3) unsigned NOT NULL,
	`entry_related` tinyint NOT NULL DEFAULT 0,
	`entry_public` tinyint NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `chii_blog_photo` (
	`photo_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`photo_eid` mediumint(8) unsigned NOT NULL,
	`photo_uid` mediumint(8) unsigned NOT NULL,
	`photo_target` varchar(255) NOT NULL,
	`photo_vote` mediumint(8) unsigned NOT NULL,
	`photo_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_characters` (
	`crt_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`crt_name` varchar(255) NOT NULL,
	`crt_role` tinyint NOT NULL,
	`crt_infobox` mediumtext NOT NULL,
	`crt_summary` mediumtext NOT NULL,
	`crt_img` varchar(255) NOT NULL,
	`crt_comment` mediumint(9) unsigned NOT NULL DEFAULT 0,
	`crt_collects` mediumint(8) unsigned NOT NULL,
	`crt_dateline` int(10) unsigned NOT NULL,
	`crt_lastpost` int(11) unsigned NOT NULL,
	`crt_lock` tinyint NOT NULL DEFAULT 0,
	`crt_img_anidb` varchar(255) NOT NULL,
	`crt_anidb_id` mediumint(8) unsigned NOT NULL,
	`crt_ban` tinyint NOT NULL DEFAULT 0,
	`crt_redirect` int(10) unsigned NOT NULL DEFAULT 0,
	`crt_nsfw` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_crt_cast_index` (
	`crt_id` mediumint(9) unsigned NOT NULL,
	`prsn_id` mediumint(9) unsigned NOT NULL,
	`subject_id` mediumint(9) unsigned NOT NULL,
	`subject_type_id` tinyint NOT NULL,
	`summary` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_crt_comments` (
	`crt_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`crt_pst_mid` mediumint(8) unsigned NOT NULL,
	`crt_pst_uid` mediumint(8) unsigned NOT NULL,
	`crt_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`crt_pst_dateline` int(10) unsigned NOT NULL,
	`crt_pst_content` mediumtext NOT NULL,
	`crt_pst_state` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_crt_revisions` (
	`rev_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`rev_crt_id` mediumint(8) unsigned NOT NULL,
	`rev_crt_name` varchar(80) NOT NULL,
	`rev_crt_name_cn` varchar(80) NOT NULL,
	`rev_crt_info_wiki` mediumtext NOT NULL,
	`rev_crt_summary` mediumtext NOT NULL,
	`rev_dateline` int(10) unsigned NOT NULL,
	`rev_creator` mediumint(8) unsigned NOT NULL,
	`rev_edit_summary` varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_crt_subject_index` (
	`crt_id` mediumint(9) unsigned NOT NULL,
	`subject_id` mediumint(9) unsigned NOT NULL,
	`subject_type_id` tinyint NOT NULL,
	`crt_type` tinyint NOT NULL,
	`ctr_appear_eps` mediumtext NOT NULL,
	`crt_order` smallint(6) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_crt_subject_index_bak_240803` (
	`crt_id` mediumint(9) unsigned NOT NULL,
	`subject_id` mediumint(9) unsigned NOT NULL,
	`subject_type_id` tinyint NOT NULL,
	`crt_type` tinyint NOT NULL,
	`ctr_appear_eps` mediumtext NOT NULL,
	`crt_order` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_clubs` (
	`club_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`club_type` tinyint NOT NULL,
	`club_name` char(50) NOT NULL,
	`club_title` char(50) NOT NULL,
	`club_icon` varchar(255) NOT NULL,
	`club_creator` mediumint(8) unsigned NOT NULL,
	`club_pro_book` tinyint NOT NULL DEFAULT 0,
	`club_pro_music` tinyint NOT NULL DEFAULT 0,
	`club_pro_game` tinyint NOT NULL DEFAULT 0,
	`club_members` mediumint(8) unsigned NOT NULL,
	`club_followers` mediumint(8) unsigned NOT NULL,
	`club_desc` mediumtext NOT NULL,
	`club_builddate` int(10) unsigned NOT NULL,
	`club_lastupdate` int(10) unsigned NOT NULL,
	`club_ban` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_comments` (
	`club_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`club_pst_mid` mediumint(8) unsigned NOT NULL,
	`club_pst_uid` mediumint(8) unsigned NOT NULL,
	`club_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`club_pst_dateline` int(10) unsigned NOT NULL,
	`club_pst_content` mediumtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_fields` (
	`cf_cid` mediumint(8) unsigned NOT NULL,
	`cf_header` varchar(255) NOT NULL,
	`cf_bg` varchar(255) NOT NULL,
	`cf_theme` tinyint NOT NULL DEFAULT 1,
	`cf_design` mediumtext NOT NULL,
	`cf_model` mediumtext NOT NULL,
	CONSTRAINT `cf_cid` UNIQUE(`cf_cid`)
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_members` (
	`cmb_uid` mediumint(8) unsigned NOT NULL,
	`cmb_cid` mediumint(8) unsigned NOT NULL,
	`cmb_moderator` tinyint NOT NULL,
	`cmb_perm` mediumtext NOT NULL,
	`cmb_note` varchar(255) NOT NULL,
	`cmb_deteline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_posts` (
	`club_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`club_pst_mid` mediumint(8) unsigned NOT NULL,
	`club_pst_uid` mediumint(8) unsigned NOT NULL,
	`club_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`club_pst_content` mediumtext NOT NULL,
	`club_pst_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_related_blog` (
	`crb_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`crb_uid` mediumint(8) unsigned NOT NULL,
	`crb_club_id` mediumint(8) unsigned NOT NULL,
	`crb_entry_id` mediumint(8) unsigned NOT NULL,
	`crb_stick` tinyint NOT NULL DEFAULT 0,
	`crb_dateline` int(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_timeline` (
	`tml_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`tml_cid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`tml_type` smallint(6) unsigned NOT NULL DEFAULT 0,
	`tml_related` char(255) NOT NULL DEFAULT '0',
	`tml_memo` mediumtext NOT NULL,
	`tml_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_club_topics` (
	`club_tpc_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`club_tpc_club_id` mediumint(8) unsigned NOT NULL,
	`club_tpc_uid` mediumint(8) unsigned NOT NULL,
	`club_tpc_title` varchar(80) NOT NULL,
	`club_tpc_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`club_tpc_lastpost` int(10) unsigned NOT NULL DEFAULT 0,
	`club_tpc_replies` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`club_tpc_display` tinyint NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_invites` (
	`uid` mediumint(8) unsigned NOT NULL,
	`dateline` int(10) unsigned NOT NULL,
	`invitecode` char(19) NOT NULL,
	`status` tinyint NOT NULL DEFAULT 0,
	`invite_uid` mediumint(8) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_preorder` (
	`pre_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`pre_uid` mediumint(8) unsigned NOT NULL,
	`pre_type` tinyint NOT NULL,
	`pre_mid` mediumint(8) unsigned NOT NULL,
	`pre_details` mediumtext NOT NULL,
	`pre_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_preorder_return` (
	`rt_id` bigint(20) unsigned NOT NULL,
	`rt_pid` int(10) unsigned AUTO_INCREMENT NOT NULL,
	`rt_uid` mediumint(8) unsigned NOT NULL,
	`rt_status` tinyint NOT NULL,
	`rt_juiz` mediumint(8) unsigned NOT NULL,
	`rt_paymail` varchar(255) NOT NULL,
	`rt_phone` varchar(255) NOT NULL,
	`rt_realname` varchar(255) NOT NULL,
	`rt_uname` varchar(255) NOT NULL,
	`rt_remark` text NOT NULL,
	`rt_comment` text NOT NULL,
	`rt_dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `rt_id_2` UNIQUE(`rt_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subjects` (
	`subject_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`subject_type` tinyint NOT NULL,
	`subject_cat` tinyint NOT NULL,
	`subject_name` varchar(255) NOT NULL,
	`subject_infobox` mediumtext NOT NULL,
	`subject_desc` mediumtext NOT NULL,
	`subject_img` varchar(255) NOT NULL,
	`subject_collects` mediumint(8) unsigned NOT NULL,
	`subject_status` tinyint NOT NULL DEFAULT 0,
	`subject_original` tinyint NOT NULL DEFAULT 0,
	`subject_sexual` tinyint NOT NULL DEFAULT 0,
	`subject_age_limit` tinyint NOT NULL DEFAULT 0,
	`subject_tags` varchar(255) NOT NULL,
	`subject_attr_tags` varchar(255) NOT NULL,
	`subject_creator` mediumint(8) unsigned NOT NULL,
	`subject_comment` mediumint(8) unsigned NOT NULL,
	`subject_dateline` int(10) unsigned NOT NULL,
	`subject_lasttouch` int(10) unsigned NOT NULL,
	`subject_lastpost` int(10) unsigned NOT NULL,
	`subject_ban` tinyint NOT NULL,
	`subject_ban_reason` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subject_attr_tags` (
	`subject_id` mediumint(8) unsigned NOT NULL,
	`tag_id` tinyint NOT NULL,
	CONSTRAINT `subject_id` UNIQUE(`subject_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subject_club_index` (
	`subject_id` mediumint(8) unsigned NOT NULL,
	`club_id` mediumint(8) unsigned NOT NULL,
	`subject_type` tinyint NOT NULL,
	`club_role` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `subject_id` UNIQUE(`subject_id`,`club_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subject_collects` (
	`clt_uid` mediumint(8) unsigned NOT NULL,
	`clt_subject_id` mediumint(8) unsigned NOT NULL,
	`clt_subject_type` tinyint NOT NULL,
	`clt_dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `clt_uid` UNIQUE(`clt_uid`,`clt_subject_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subject_comments` (
	`sbj_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`sbj_pst_mid` mediumint(8) unsigned NOT NULL,
	`sbj_pst_uid` mediumint(8) unsigned NOT NULL,
	`sbj_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`sbj_pst_related_photo` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`sbj_pst_dateline` int(10) unsigned NOT NULL,
	`sbj_pst_content` mediumtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subject_event_index` (
	`event_id` mediumint(8) unsigned NOT NULL,
	`subject_id` mediumint(8) unsigned NOT NULL,
	`subject_type` tinyint NOT NULL,
	`dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `event_id` UNIQUE(`event_id`,`subject_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_doujin_subject_photos` (
	`sbj_photo_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`sbj_photo_mid` mediumint(8) unsigned NOT NULL,
	`sbj_photo_uid` mediumint(8) unsigned NOT NULL,
	`sbj_photo_target` text NOT NULL,
	`sbj_photo_comment` mediumint(8) unsigned NOT NULL,
	`sbj_photo_dateline` int(10) unsigned NOT NULL,
	`sbj_photo_lasttouch` int(10) unsigned NOT NULL,
	`sbj_photo_ban` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_eden` (
	`eden_id` smallint(6) unsigned AUTO_INCREMENT NOT NULL,
	`eden_type` smallint(6) unsigned NOT NULL,
	`eden_name` char(50) NOT NULL,
	`eden_title` char(50) NOT NULL,
	`eden_icon` varchar(255) NOT NULL,
	`eden_header` varchar(255) NOT NULL,
	`eden_desc` mediumtext NOT NULL,
	`eden_relate_subject` mediumtext NOT NULL,
	`eden_relate_grp` mediumtext NOT NULL,
	`eden_members` mediumint(8) unsigned NOT NULL,
	`eden_lasttouch` int(10) unsigned NOT NULL,
	`eden_builddate` int(10) unsigned NOT NULL,
	`eden_pushdate` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_eden_members` (
	`emb_uid` mediumint(8) NOT NULL DEFAULT 0,
	`emb_eid` smallint(6) NOT NULL DEFAULT 0,
	`emb_moderator` tinyint NOT NULL DEFAULT 0,
	`emb_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_episodes` (
	`ep_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`ep_subject_id` mediumint(8) unsigned NOT NULL,
	`ep_sort` float unsigned NOT NULL DEFAULT 0,
	`ep_type` tinyint NOT NULL,
	`ep_disc` tinyint NOT NULL DEFAULT 0,
	`ep_name` varchar(80) NOT NULL,
	`ep_name_cn` varchar(80) NOT NULL,
	`ep_rate` tinyint NOT NULL,
	`ep_duration` varchar(80) NOT NULL,
	`ep_airdate` varchar(80) NOT NULL,
	`ep_online` mediumtext NOT NULL,
	`ep_comment` mediumint(8) unsigned NOT NULL,
	`ep_resources` mediumint(8) unsigned NOT NULL,
	`ep_desc` mediumtext NOT NULL,
	`ep_dateline` int(10) unsigned NOT NULL,
	`ep_lastpost` int(10) unsigned NOT NULL,
	`ep_lock` tinyint NOT NULL DEFAULT 0,
	`ep_ban` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_ep_comments` (
	`ep_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`ep_pst_mid` mediumint(8) unsigned NOT NULL,
	`ep_pst_uid` mediumint(8) unsigned NOT NULL,
	`ep_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`ep_pst_dateline` int(10) unsigned NOT NULL,
	`ep_pst_content` mediumtext NOT NULL,
	`ep_pst_state` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_ep_revisions` (
	`ep_rev_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`rev_sid` mediumint(8) unsigned NOT NULL,
	`rev_eids` varchar(255) NOT NULL,
	`rev_ep_infobox` mediumtext NOT NULL,
	`rev_creator` mediumint(8) unsigned NOT NULL,
	`rev_version` tinyint NOT NULL DEFAULT 0,
	`rev_dateline` int(10) unsigned NOT NULL,
	`rev_edit_summary` varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_ep_status` (
	`ep_stt_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`ep_stt_uid` mediumint(8) unsigned NOT NULL,
	`ep_stt_sid` mediumint(8) unsigned NOT NULL,
	`ep_stt_on_prg` tinyint NOT NULL DEFAULT 0,
	`ep_stt_status` mediumtext NOT NULL,
	`ep_stt_lasttouch` int(10) unsigned NOT NULL,
	CONSTRAINT `ep_stt_uniq` UNIQUE(`ep_stt_uid`,`ep_stt_sid`)
);
--> statement-breakpoint
CREATE TABLE `chii_events` (
	`event_id` int(10) unsigned AUTO_INCREMENT NOT NULL,
	`event_title` varchar(255) NOT NULL,
	`event_type` tinyint NOT NULL,
	`event_creator` int(10) unsigned NOT NULL,
	`event_start_time` int(10) unsigned NOT NULL,
	`event_end_time` int(10) unsigned NOT NULL,
	`event_img` varchar(255) NOT NULL,
	`event_state` mediumint(8) unsigned NOT NULL,
	`event_city` mediumint(8) unsigned NOT NULL,
	`event_address` varchar(255) NOT NULL,
	`event_desc` text NOT NULL,
	`event_wish` mediumint(8) unsigned NOT NULL,
	`event_do` mediumint(8) unsigned NOT NULL,
	`event_buildtime` int(10) unsigned NOT NULL,
	`event_lastupdate` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_event_club_index` (
	`event_id` mediumint(8) unsigned NOT NULL,
	`club_id` mediumint(8) unsigned NOT NULL,
	`club_place` varchar(255) NOT NULL,
	`dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `event_id` UNIQUE(`event_id`,`club_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_event_collects` (
	`clt_uid` mediumint(8) unsigned NOT NULL,
	`clt_event_id` mediumint(8) unsigned NOT NULL,
	`clt_type` tinyint NOT NULL,
	`clt_dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `clt_uid` UNIQUE(`clt_uid`,`clt_event_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_event_posts` (
	`event_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`event_pst_mid` mediumint(8) unsigned NOT NULL,
	`event_pst_uid` mediumint(8) unsigned NOT NULL,
	`event_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`event_pst_content` mediumtext NOT NULL,
	`event_pst_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_event_topics` (
	`event_tpc_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`event_tpc_mid` mediumint(8) unsigned NOT NULL,
	`event_tpc_uid` mediumint(8) unsigned NOT NULL,
	`event_tpc_title` varchar(80) NOT NULL,
	`event_tpc_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`event_tpc_lastpost` int(10) unsigned NOT NULL DEFAULT 0,
	`event_tpc_replies` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`event_tpc_display` tinyint NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `chii_failedlogins` (
	`ip` char(15) NOT NULL DEFAULT '',
	`count` tinyint NOT NULL DEFAULT 0,
	`lastupdate` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_friends` (
	`frd_uid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`frd_fid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`frd_grade` tinyint NOT NULL DEFAULT 1,
	`frd_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`frd_description` char(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_gadgets` (
	`gdt_id` mediumint(8) AUTO_INCREMENT NOT NULL,
	`gdt_app_id` mediumint(8) NOT NULL,
	`gdt_version` varchar(255) NOT NULL,
	`gdt_creator` mediumint(8) NOT NULL,
	`gdt_script` mediumtext NOT NULL,
	`gdt_style` mediumtext NOT NULL,
	`gdt_has_script` tinyint NOT NULL,
	`gdt_has_style` tinyint NOT NULL,
	`gdt_status` tinyint NOT NULL,
	`gdt_edit_summary` varchar(255) NOT NULL,
	`gdt_timestamp` int(10) NOT NULL,
	`gdt_lasttouch` int(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_groups` (
	`grp_id` smallint(6) unsigned AUTO_INCREMENT NOT NULL,
	`grp_cat` smallint(6) unsigned NOT NULL DEFAULT 0,
	`grp_name` char(50) NOT NULL,
	`grp_title` char(50) NOT NULL,
	`grp_icon` varchar(255) NOT NULL,
	`grp_creator` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`grp_topics` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`grp_posts` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`grp_members` mediumint(8) unsigned NOT NULL DEFAULT 1,
	`grp_desc` text NOT NULL,
	`grp_lastpost` int(10) unsigned NOT NULL,
	`grp_builddate` int(10) unsigned NOT NULL,
	`grp_accessible` tinyint NOT NULL DEFAULT 1,
	`grp_nsfw` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_group_members` (
	`gmb_uid` mediumint(8) NOT NULL DEFAULT 0,
	`gmb_gid` smallint(6) NOT NULL DEFAULT 0,
	`gmb_moderator` tinyint NOT NULL DEFAULT 0,
	`gmb_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_group_posts` (
	`grp_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`grp_pst_mid` mediumint(8) unsigned NOT NULL,
	`grp_pst_uid` mediumint(8) unsigned NOT NULL,
	`grp_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`grp_pst_content` mediumtext NOT NULL,
	`grp_pst_state` tinyint NOT NULL,
	`grp_pst_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_group_topics` (
	`grp_tpc_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`grp_tpc_gid` mediumint(8) unsigned NOT NULL,
	`grp_tpc_uid` mediumint(8) unsigned NOT NULL,
	`grp_tpc_title` varchar(80) NOT NULL,
	`grp_tpc_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`grp_tpc_lastpost` int(10) unsigned NOT NULL DEFAULT 0,
	`grp_tpc_replies` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`grp_tpc_state` tinyint NOT NULL,
	`grp_tpc_display` tinyint NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `chii_index` (
	`idx_id` mediumint(8) AUTO_INCREMENT NOT NULL,
	`idx_type` tinyint NOT NULL DEFAULT 0,
	`idx_title` varchar(80) NOT NULL,
	`idx_desc` mediumtext NOT NULL,
	`idx_replies` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`idx_subject_total` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`idx_collects` mediumint(8) NOT NULL DEFAULT 0,
	`idx_stats` mediumtext NOT NULL,
	`idx_dateline` int(10) NOT NULL,
	`idx_lasttouch` int(10) unsigned NOT NULL,
	`idx_uid` mediumint(8) NOT NULL,
	`idx_ban` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `mid` UNIQUE(`idx_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_index_collects` (
	`idx_clt_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`idx_clt_mid` mediumint(8) unsigned NOT NULL,
	`idx_clt_uid` mediumint(8) unsigned NOT NULL,
	`idx_clt_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_index_comments` (
	`idx_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`idx_pst_mid` mediumint(8) unsigned NOT NULL,
	`idx_pst_uid` mediumint(8) unsigned NOT NULL,
	`idx_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`idx_pst_dateline` int(10) unsigned NOT NULL,
	`idx_pst_content` mediumtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_index_related` (
	`idx_rlt_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`idx_rlt_cat` tinyint NOT NULL,
	`idx_rlt_rid` mediumint(8) unsigned NOT NULL,
	`idx_rlt_type` smallint(6) unsigned NOT NULL,
	`idx_rlt_sid` mediumint(8) unsigned NOT NULL,
	`idx_rlt_order` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`idx_rlt_comment` mediumtext NOT NULL,
	`idx_rlt_dateline` int(10) unsigned NOT NULL,
	`idx_rlt_ban` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_issues` (
	`isu_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`isu_type` tinyint NOT NULL,
	`isu_main_id` mediumint(8) unsigned NOT NULL,
	`isu_value` mediumint(8) unsigned NOT NULL,
	`isu_creator` mediumint(8) unsigned NOT NULL,
	`isu_operator` mediumint(8) unsigned NOT NULL,
	`isu_status` tinyint NOT NULL,
	`isu_reason` mediumtext NOT NULL,
	`isu_related` mediumint(8) unsigned NOT NULL,
	`isu_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_likes` (
	`type` mediumint(8) unsigned NOT NULL,
	`main_id` int(10) unsigned NOT NULL DEFAULT 0,
	`related_id` int(10) unsigned NOT NULL,
	`uid` mediumint(8) unsigned NOT NULL,
	`value` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`ban` tinyint NOT NULL DEFAULT 0,
	`created_at` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_likes_bak_230331` (
	`type` mediumint(8) unsigned NOT NULL,
	`main_id` int(10) unsigned NOT NULL,
	`related_id` int(10) unsigned NOT NULL,
	`uid` mediumint(8) unsigned NOT NULL,
	`value` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`ban` tinyint NOT NULL DEFAULT 0,
	`created_at` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_magi_answered` (
	`asw_qid` mediumint(8) unsigned NOT NULL,
	`asw_uid` mediumint(8) unsigned NOT NULL,
	`asw_answer` tinyint NOT NULL,
	`asw_result` tinyint NOT NULL,
	`asw_dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `asw_qid` UNIQUE(`asw_qid`,`asw_uid`)
);
--> statement-breakpoint
CREATE TABLE `chii_magi_members` (
	`mgm_uid` mediumint(8) unsigned NOT NULL,
	`mgm_correct` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`mgm_answered` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`mgm_created` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`mgm_rank` mediumint(8) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_magi_questions` (
	`qst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`qst_type` tinyint NOT NULL,
	`qst_content` mediumtext NOT NULL,
	`qst_options` mediumtext NOT NULL,
	`qst_answer` tinyint NOT NULL,
	`qst_relate_type` tinyint NOT NULL,
	`qst_related` mediumint(8) unsigned NOT NULL,
	`qst_correct` mediumint(8) unsigned NOT NULL,
	`qst_answered` mediumint(8) unsigned NOT NULL,
	`qst_creator` mediumint(8) unsigned NOT NULL,
	`qst_dateline` int(10) unsigned NOT NULL,
	`qst_ban` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_memberfields` (
	`uid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`site` varchar(75) NOT NULL DEFAULT '',
	`location` varchar(30) NOT NULL DEFAULT '',
	`bio` text NOT NULL,
	`homepage` mediumtext NOT NULL,
	`index_sort` mediumtext NOT NULL,
	`user_agent` varchar(255) NOT NULL,
	`ignorepm` text NOT NULL,
	`groupterms` text NOT NULL,
	`authstr` varchar(20) NOT NULL DEFAULT '',
	`privacy` mediumtext NOT NULL,
	`blocklist` mediumtext NOT NULL,
	`reg_source` tinyint NOT NULL,
	`invite_num` tinyint NOT NULL DEFAULT 0,
	`email_verified` tinyint NOT NULL DEFAULT 0,
	`email_verify_token` varchar(255) NOT NULL,
	`email_verify_score` float NOT NULL,
	`email_verify_dateline` int(10) unsigned NOT NULL,
	`reset_password_force` tinyint NOT NULL,
	`reset_password_token` varchar(255) NOT NULL,
	`reset_password_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_members` (
	`uid` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`username` char(15) NOT NULL DEFAULT '',
	`nickname` varchar(30) NOT NULL,
	`password_crypt` char(64) NOT NULL,
	`avatar` varchar(255) NOT NULL,
	`secques` char(8) NOT NULL DEFAULT '',
	`gender` tinyint NOT NULL DEFAULT 0,
	`adminid` tinyint NOT NULL DEFAULT 0,
	`groupid` smallint(6) unsigned NOT NULL DEFAULT 0,
	`regip` char(15) NOT NULL DEFAULT '',
	`regdate` int(10) unsigned NOT NULL DEFAULT 0,
	`lastip` char(15) NOT NULL DEFAULT '',
	`lastvisit` int(10) unsigned NOT NULL DEFAULT 0,
	`lastactivity` int(10) unsigned NOT NULL DEFAULT 0,
	`lastpost` int(10) unsigned NOT NULL DEFAULT 0,
	`email` char(50) NOT NULL DEFAULT '',
	`bday` date NOT NULL DEFAULT '0000-00-00',
	`styleid` smallint(6) unsigned NOT NULL DEFAULT 0,
	`dateformat` char(10) NOT NULL DEFAULT '',
	`timeformat` tinyint NOT NULL DEFAULT 0,
	`newsletter` tinyint NOT NULL DEFAULT 0,
	`timeoffset` char(4) NOT NULL DEFAULT '',
	`newpm` tinyint NOT NULL DEFAULT 0,
	`new_notify` smallint(6) unsigned NOT NULL DEFAULT 0,
	`username_lock` tinyint NOT NULL DEFAULT 0,
	`ukagaka_settings` varchar(255) NOT NULL DEFAULT '0|0|0',
	`acl` mediumtext NOT NULL,
	`img_chart` smallint(6) unsigned NOT NULL DEFAULT 0,
	`sign` varchar(255) NOT NULL,
	`invited` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `chii_network_services` (
	`ns_uid` mediumint(8) unsigned NOT NULL,
	`ns_service_id` tinyint NOT NULL,
	`ns_account` varchar(255) NOT NULL,
	`ns_dateline` int(10) unsigned NOT NULL,
	CONSTRAINT `ns_uid` UNIQUE(`ns_uid`,`ns_service_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_notify` (
	`nt_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`nt_uid` mediumint(8) unsigned NOT NULL,
	`nt_from_uid` mediumint(8) unsigned NOT NULL,
	`nt_status` tinyint NOT NULL DEFAULT 1,
	`nt_type` tinyint NOT NULL DEFAULT 0,
	`nt_mid` mediumint(8) unsigned NOT NULL,
	`nt_related_id` int(10) unsigned NOT NULL,
	`nt_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_notify_field` (
	`ntf_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`ntf_hash` tinyint NOT NULL DEFAULT 0,
	`ntf_rid` int(10) unsigned NOT NULL,
	`ntf_title` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_oauth_access_tokens` (
	`id` mediumint(8) AUTO_INCREMENT NOT NULL,
	`type` tinyint NOT NULL DEFAULT 0,
	`access_token` varchar(40) NOT NULL,
	`client_id` varchar(80) NOT NULL,
	`user_id` varchar(80),
	`expires` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP' ON UPDATE CURRENT_TIMESTAMP,
	`scope` varchar(4000),
	`info` varchar(255) NOT NULL,
	CONSTRAINT `access_token` UNIQUE(`access_token`)
);
--> statement-breakpoint
CREATE TABLE `chii_oauth_authorization_codes` (
	`authorization_code` varchar(40) NOT NULL,
	`client_id` varchar(80) NOT NULL,
	`user_id` varchar(80),
	`redirect_uri` varchar(2000),
	`expires` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP' ON UPDATE CURRENT_TIMESTAMP,
	`scope` varchar(4000),
	`id_token` varchar(1000)
);
--> statement-breakpoint
CREATE TABLE `chii_oauth_clients` (
	`app_id` mediumint(8) NOT NULL,
	`client_id` varchar(80) NOT NULL,
	`client_secret` varchar(80),
	`redirect_uri` varchar(2000),
	`grant_types` varchar(80),
	`scope` varchar(4000),
	`user_id` varchar(80)
);
--> statement-breakpoint
CREATE TABLE `chii_oauth_jwt` (
	`client_id` varchar(80) NOT NULL,
	`subject` varchar(80),
	`public_key` varchar(2000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_oauth_refresh_tokens` (
	`refresh_token` varchar(40) NOT NULL,
	`client_id` varchar(80) NOT NULL,
	`user_id` varchar(80),
	`expires` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP' ON UPDATE CURRENT_TIMESTAMP,
	`scope` varchar(4000)
);
--> statement-breakpoint
CREATE TABLE `chii_oauth_scopes` (
	`scope` varchar(80) NOT NULL,
	`is_default` tinyint
);
--> statement-breakpoint
CREATE TABLE `chii_onlinetime` (
	`uid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`thismonth` smallint(6) unsigned NOT NULL DEFAULT 0,
	`total` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`lastupdate` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_os_web_sessions` (
	`key` char(64) NOT NULL,
	`user_id` int(10) unsigned NOT NULL,
	`value` mediumblob NOT NULL,
	`created_at` bigint(20) NOT NULL,
	`expired_at` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_persons` (
	`prsn_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`prsn_name` varchar(255) NOT NULL,
	`prsn_type` tinyint NOT NULL,
	`prsn_infobox` mediumtext NOT NULL,
	`prsn_producer` tinyint NOT NULL,
	`prsn_mangaka` tinyint NOT NULL,
	`prsn_artist` tinyint NOT NULL,
	`prsn_seiyu` tinyint NOT NULL,
	`prsn_writer` tinyint NOT NULL DEFAULT 0,
	`prsn_illustrator` tinyint NOT NULL DEFAULT 0,
	`prsn_actor` tinyint NOT NULL,
	`prsn_summary` mediumtext NOT NULL,
	`prsn_img` varchar(255) NOT NULL,
	`prsn_img_anidb` varchar(255) NOT NULL,
	`prsn_comment` mediumint(9) unsigned NOT NULL,
	`prsn_collects` mediumint(8) unsigned NOT NULL,
	`prsn_dateline` int(10) unsigned NOT NULL,
	`prsn_lastpost` int(11) unsigned NOT NULL,
	`prsn_lock` tinyint NOT NULL,
	`prsn_anidb_id` mediumint(8) unsigned NOT NULL,
	`prsn_ban` tinyint NOT NULL DEFAULT 0,
	`prsn_redirect` int(10) unsigned NOT NULL DEFAULT 0,
	`prsn_nsfw` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_person_alias` (
	`prsn_cat` enum('prsn','crt') NOT NULL,
	`prsn_id` mediumint(9) unsigned NOT NULL,
	`alias_name` varchar(255) NOT NULL,
	`alias_type` tinyint NOT NULL,
	`alias_key` varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_person_collects` (
	`prsn_clt_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`prsn_clt_cat` enum('prsn','crt') NOT NULL,
	`prsn_clt_mid` mediumint(8) unsigned NOT NULL,
	`prsn_clt_uid` mediumint(8) unsigned NOT NULL,
	`prsn_clt_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_person_cs_index` (
	`prsn_type` enum('prsn','crt') NOT NULL,
	`prsn_id` mediumint(9) unsigned NOT NULL,
	`prsn_position` smallint(5) unsigned NOT NULL,
	`subject_id` mediumint(9) unsigned NOT NULL,
	`subject_type_id` tinyint NOT NULL,
	`summary` mediumtext NOT NULL,
	`prsn_appear_eps` mediumtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_person_fields` (
	`prsn_cat` enum('prsn','crt') NOT NULL,
	`prsn_id` int(8) unsigned NOT NULL,
	`gender` tinyint NOT NULL,
	`bloodtype` tinyint NOT NULL,
	`birth_year` year(4) NOT NULL,
	`birth_mon` tinyint NOT NULL,
	`birth_day` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_person_relationship` (
	`prsn_type` enum('prsn','crt') NOT NULL,
	`prsn_id` mediumint(9) unsigned NOT NULL,
	`relat_prsn_type` enum('prsn','crt') NOT NULL,
	`relat_prsn_id` mediumint(9) unsigned NOT NULL,
	`relat_type` smallint(6) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_pms` (
	`msg_id` int(10) unsigned AUTO_INCREMENT NOT NULL,
	`msg_sid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`msg_rid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`msg_folder` enum('inbox','outbox') NOT NULL DEFAULT 'inbox',
	`msg_new` tinyint NOT NULL DEFAULT 0,
	`msg_title` varchar(75) NOT NULL,
	`msg_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`msg_message` text NOT NULL,
	`msg_related_main` int(10) unsigned NOT NULL DEFAULT 0,
	`msg_related` int(10) unsigned NOT NULL,
	`msg_sdeleted` tinyint NOT NULL DEFAULT 0,
	`msg_rdeleted` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_prsn_comments` (
	`prsn_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`prsn_pst_mid` mediumint(8) unsigned NOT NULL,
	`prsn_pst_uid` mediumint(8) unsigned NOT NULL,
	`prsn_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`prsn_pst_dateline` int(10) unsigned NOT NULL,
	`prsn_pst_content` mediumtext NOT NULL,
	`prsn_pst_state` tinyint NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_regips` (
	`ip` char(15) NOT NULL DEFAULT '',
	`dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`count` smallint(6) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_resources` (
	`res_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`res_eid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`res_type` tinyint NOT NULL DEFAULT 0,
	`res_tool` tinyint NOT NULL DEFAULT 0,
	`res_url` mediumtext NOT NULL,
	`res_ext` varchar(5) NOT NULL,
	`res_audio_lang` tinyint NOT NULL DEFAULT 0,
	`res_sub_lang` tinyint NOT NULL DEFAULT 0,
	`res_quality` tinyint NOT NULL DEFAULT 0,
	`res_source` mediumtext NOT NULL,
	`res_version` tinyint NOT NULL,
	`res_creator` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`res_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_rev_history` (
	`rev_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`rev_type` tinyint NOT NULL,
	`rev_mid` mediumint(8) unsigned NOT NULL,
	`rev_text_id` mediumint(9) unsigned NOT NULL,
	`rev_dateline` int(10) unsigned NOT NULL,
	`rev_creator` mediumint(8) unsigned NOT NULL,
	`rev_edit_summary` varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_rev_text` (
	`rev_text_id` mediumint(9) unsigned AUTO_INCREMENT NOT NULL,
	`rev_text` mediumblob NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_robot_personality` (
	`rbt_psn_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`rbt_psn_name` varchar(255) NOT NULL,
	`rbt_psn_creator` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`rbt_psn_desc` mediumtext NOT NULL,
	`rbt_psn_speech` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`rbt_psn_ban` tinyint NOT NULL DEFAULT 0,
	`rbt_psn_lasttouch` int(10) unsigned NOT NULL,
	`rbt_psn_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_robot_speech` (
	`rbt_spc_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`rbt_spc_mid` mediumint(8) unsigned NOT NULL,
	`rbt_spc_uid` mediumint(8) unsigned NOT NULL,
	`rbt_spc_speech` varchar(255) NOT NULL,
	`rbt_spc_ban` tinyint NOT NULL DEFAULT 0,
	`rbt_spc_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_searchindex` (
	`keywords` varchar(255) NOT NULL DEFAULT '',
	`searchstring` varchar(255) NOT NULL DEFAULT '',
	`dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`expiration` int(10) unsigned NOT NULL DEFAULT 0,
	`threads` smallint(6) unsigned NOT NULL DEFAULT 0,
	`tids` text NOT NULL,
	`type` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_sessions` (
	`sid` char(6) NOT NULL DEFAULT '',
	`ip1` tinyint NOT NULL DEFAULT 0,
	`ip2` tinyint NOT NULL DEFAULT 0,
	`ip3` tinyint NOT NULL DEFAULT 0,
	`ip4` tinyint NOT NULL DEFAULT 0,
	`uid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`username` char(15) NOT NULL DEFAULT '',
	`groupid` smallint(6) unsigned NOT NULL DEFAULT 0,
	`styleid` smallint(6) unsigned NOT NULL DEFAULT 0,
	`invisible` tinyint NOT NULL DEFAULT 0,
	`action` tinyint NOT NULL DEFAULT 0,
	`lastactivity` int(10) unsigned NOT NULL DEFAULT 0,
	`lastolupdate` int(10) unsigned NOT NULL DEFAULT 0,
	`pageviews` smallint(6) unsigned NOT NULL DEFAULT 0,
	`seccode` mediumint(6) unsigned NOT NULL DEFAULT 0,
	`fid` smallint(6) unsigned NOT NULL DEFAULT 0,
	`tid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`bloguid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `sid` UNIQUE(`sid`)
);
--> statement-breakpoint
CREATE TABLE `chii_settings` (
	`variable` varchar(32) NOT NULL DEFAULT '',
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_stats` (
	`unit` mediumint(8) unsigned NOT NULL,
	`category` mediumint(8) unsigned NOT NULL,
	`type` mediumint(8) unsigned NOT NULL,
	`sub_type` mediumint(8) unsigned NOT NULL,
	`related_id` mediumint(8) unsigned NOT NULL,
	`value` int(11) NOT NULL,
	`timestamp` int(10) unsigned NOT NULL,
	`updated_at` int(10) unsigned NOT NULL,
	CONSTRAINT `unit` UNIQUE(`unit`,`related_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_subjects` (
	`subject_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`subject_type_id` smallint(6) unsigned NOT NULL DEFAULT 0,
	`subject_name` varchar(512) NOT NULL,
	`subject_name_cn` varchar(512) NOT NULL,
	`subject_uid` varchar(20) NOT NULL,
	`subject_creator` mediumint(8) unsigned NOT NULL,
	`subject_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`subject_image` varchar(255) NOT NULL,
	`subject_platform` smallint(6) unsigned NOT NULL DEFAULT 0,
	`field_infobox` mediumtext NOT NULL,
	`field_meta_tags` mediumtext NOT NULL,
	`field_summary` mediumtext NOT NULL,
	`field_5` mediumtext NOT NULL,
	`field_volumes` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_eps` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_wish` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_collect` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_doing` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_on_hold` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_dropped` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_series` tinyint NOT NULL DEFAULT 0,
	`subject_series_entry` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_idx_cn` varchar(1) NOT NULL,
	`subject_airtime` tinyint NOT NULL,
	`subject_nsfw` tinyint NOT NULL,
	`subject_ban` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_subjects_240921` (
	`subject_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`subject_type_id` smallint(6) unsigned NOT NULL DEFAULT 0,
	`subject_name` varchar(80) NOT NULL,
	`subject_name_cn` varchar(80) NOT NULL,
	`subject_uid` varchar(20) NOT NULL,
	`subject_creator` mediumint(8) unsigned NOT NULL,
	`subject_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`subject_image` varchar(255) NOT NULL,
	`subject_platform` smallint(6) unsigned NOT NULL DEFAULT 0,
	`field_infobox` mediumtext NOT NULL,
	`field_summary` mediumtext NOT NULL,
	`field_5` mediumtext NOT NULL,
	`field_volumes` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_eps` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_wish` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_collect` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_doing` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_on_hold` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_dropped` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_series` tinyint NOT NULL DEFAULT 0,
	`subject_series_entry` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`subject_idx_cn` varchar(1) NOT NULL,
	`subject_airtime` tinyint NOT NULL,
	`subject_nsfw` tinyint NOT NULL,
	`subject_ban` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_subject_alias` (
	`subject_id` int(10) unsigned NOT NULL,
	`alias_name` varchar(255) NOT NULL,
	`subject_type_id` tinyint NOT NULL DEFAULT 0,
	`alias_type` tinyint NOT NULL DEFAULT 0,
	`alias_key` varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_subject_fields` (
	`field_sid` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`field_tid` smallint(6) unsigned NOT NULL DEFAULT 0,
	`field_tags` mediumtext NOT NULL,
	`field_rate_1` mediumint(8) unsigned NOT NULL,
	`field_rate_2` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_rate_3` mediumint(8) unsigned NOT NULL,
	`field_rate_4` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_rate_5` mediumint(8) unsigned NOT NULL,
	`field_rate_6` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_rate_7` mediumint(8) unsigned NOT NULL,
	`field_rate_8` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_rate_9` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`field_rate_10` mediumint(8) unsigned NOT NULL,
	`field_airtime` tinyint NOT NULL,
	`field_rank` int(10) unsigned NOT NULL DEFAULT 0,
	`field_year` year(4) NOT NULL,
	`field_mon` tinyint NOT NULL,
	`field_week_day` tinyint NOT NULL,
	`field_date` date NOT NULL,
	`field_redirect` mediumint(8) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_subject_imgs` (
	`img_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`img_subject_id` mediumint(8) unsigned NOT NULL,
	`img_uid` mediumint(8) unsigned NOT NULL,
	`img_target` varchar(255) NOT NULL,
	`img_vote` mediumint(8) unsigned NOT NULL,
	`img_nsfw` tinyint NOT NULL,
	`img_ban` tinyint NOT NULL,
	`img_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_subject_interests` (
	`interest_id` int(10) unsigned AUTO_INCREMENT NOT NULL,
	`interest_uid` mediumint(8) unsigned NOT NULL,
	`interest_subject_id` mediumint(8) unsigned NOT NULL,
	`interest_subject_type` smallint(6) unsigned NOT NULL DEFAULT 0,
	`interest_rate` tinyint NOT NULL DEFAULT 0,
	`interest_type` tinyint NOT NULL DEFAULT 0,
	`interest_has_comment` tinyint NOT NULL,
	`interest_comment` mediumtext NOT NULL,
	`interest_tag` mediumtext NOT NULL,
	`interest_ep_status` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`interest_vol_status` mediumint(8) unsigned NOT NULL,
	`interest_wish_dateline` int(10) unsigned NOT NULL,
	`interest_doing_dateline` int(10) unsigned NOT NULL,
	`interest_collect_dateline` int(10) unsigned NOT NULL,
	`interest_on_hold_dateline` int(10) unsigned NOT NULL,
	`interest_dropped_dateline` int(10) unsigned NOT NULL,
	`interest_create_ip` char(15) NOT NULL,
	`interest_lasttouch_ip` char(15) NOT NULL,
	`interest_lasttouch` int(10) unsigned NOT NULL DEFAULT 0,
	`interest_private` tinyint NOT NULL,
	CONSTRAINT `user_interest` UNIQUE(`interest_uid`,`interest_subject_id`)
);
--> statement-breakpoint
CREATE TABLE `chii_subject_posts` (
	`sbj_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`sbj_pst_mid` mediumint(8) unsigned NOT NULL,
	`sbj_pst_uid` mediumint(8) unsigned NOT NULL,
	`sbj_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`sbj_pst_content` mediumtext NOT NULL,
	`sbj_pst_state` tinyint NOT NULL,
	`sbj_pst_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_subject_rec` (
	`subject_id` mediumint(8) unsigned NOT NULL,
	`rec_subject_id` mediumint(8) unsigned NOT NULL,
	`mio_sim` float NOT NULL,
	`mio_count` mediumint(9) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_subject_rec_2` (
	`subject_id` mediumint(9) NOT NULL,
	`rec_subject_id` mediumint(9) NOT NULL,
	`mio_sim` float NOT NULL,
	`mio_count` mediumint(9) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_subject_related_blog` (
	`srb_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`srb_uid` mediumint(8) unsigned NOT NULL,
	`srb_subject_id` mediumint(8) unsigned NOT NULL,
	`srb_entry_id` mediumint(8) unsigned NOT NULL,
	`srb_spoiler` mediumint(8) unsigned NOT NULL,
	`srb_like` mediumint(8) unsigned NOT NULL,
	`srb_dislike` mediumint(8) unsigned NOT NULL,
	`srb_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_subject_relations` (
	`rlt_subject_id` mediumint(8) unsigned NOT NULL,
	`rlt_subject_type_id` tinyint NOT NULL,
	`rlt_relation_type` smallint(5) unsigned NOT NULL,
	`rlt_related_subject_id` mediumint(8) unsigned NOT NULL,
	`rlt_related_subject_type_id` tinyint NOT NULL,
	`rlt_vice_versa` tinyint NOT NULL,
	`rlt_order` smallint(6) unsigned NOT NULL,
	CONSTRAINT `rlt_subject_id` UNIQUE(`rlt_subject_id`,`rlt_related_subject_id`,`rlt_vice_versa`)
);
--> statement-breakpoint
CREATE TABLE `chii_subject_relations_bak_240803` (
	`rlt_subject_id` mediumint(8) unsigned NOT NULL,
	`rlt_subject_type_id` tinyint NOT NULL,
	`rlt_relation_type` smallint(5) unsigned NOT NULL,
	`rlt_related_subject_id` mediumint(8) unsigned NOT NULL,
	`rlt_related_subject_type_id` tinyint NOT NULL,
	`rlt_vice_versa` tinyint NOT NULL,
	`rlt_order` tinyint NOT NULL,
	CONSTRAINT `rlt_subject_id` UNIQUE(`rlt_subject_id`,`rlt_related_subject_id`,`rlt_vice_versa`)
);
--> statement-breakpoint
CREATE TABLE `chii_subject_revisions` (
	`rev_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`rev_type` tinyint NOT NULL DEFAULT 1,
	`rev_subject_id` mediumint(8) unsigned NOT NULL,
	`rev_type_id` smallint(6) unsigned NOT NULL DEFAULT 0,
	`rev_creator` mediumint(8) unsigned NOT NULL,
	`rev_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`rev_name` varchar(80) NOT NULL,
	`rev_name_cn` varchar(80) NOT NULL,
	`rev_field_infobox` mediumtext NOT NULL,
	`rev_field_meta_tags` mediumtext NOT NULL,
	`rev_field_summary` mediumtext NOT NULL,
	`rev_vote_field` mediumtext NOT NULL,
	`rev_field_eps` mediumint(8) unsigned NOT NULL,
	`rev_edit_summary` varchar(200) NOT NULL,
	`rev_platform` smallint(6) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_subject_topics` (
	`sbj_tpc_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`sbj_tpc_subject_id` mediumint(8) unsigned NOT NULL,
	`sbj_tpc_uid` mediumint(8) unsigned NOT NULL,
	`sbj_tpc_title` varchar(80) NOT NULL,
	`sbj_tpc_dateline` int(10) unsigned NOT NULL DEFAULT 0,
	`sbj_tpc_lastpost` int(10) unsigned NOT NULL DEFAULT 0,
	`sbj_tpc_replies` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`sbj_tpc_state` tinyint NOT NULL,
	`sbj_tpc_display` tinyint NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `chii_tag_index` (
	`tag_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`tag_name` varchar(30) NOT NULL,
	`tag_type_id` smallint(6) unsigned NOT NULL,
	`tag_result` mediumint(8) unsigned NOT NULL,
	`tag_dateline` int(10) unsigned NOT NULL,
	`tag_lasttouch` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_tag_list` (
	`tlt_tid` mediumint(8) unsigned NOT NULL,
	`tlt_uid` mediumint(8) unsigned NOT NULL,
	`tlt_cid` tinyint NOT NULL DEFAULT 0,
	`tlt_sid` mediumint(8) unsigned NOT NULL,
	`tag_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_tag_neue_fields` (
	`field_tid` int(10) unsigned NOT NULL,
	`field_summary` mediumtext NOT NULL,
	`field_order` mediumint(9) NOT NULL DEFAULT 0,
	`field_nsfw` tinyint NOT NULL DEFAULT 0,
	`field_lock` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_tag_neue_index` (
	`tag_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`tag_name` varchar(30) NOT NULL,
	`tag_cat` tinyint NOT NULL,
	`tag_type` tinyint NOT NULL,
	`tag_results` mediumint(8) unsigned NOT NULL,
	`tag_dateline` int(10) unsigned NOT NULL,
	`tag_lasttouch` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_tag_neue_list` (
	`tlt_tid` mediumint(8) unsigned NOT NULL,
	`tlt_uid` mediumint(8) unsigned NOT NULL,
	`tlt_cat` tinyint NOT NULL,
	`tlt_type` tinyint NOT NULL,
	`tlt_mid` mediumint(8) unsigned NOT NULL,
	`tlt_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_timeline` (
	`tml_id` int(10) unsigned AUTO_INCREMENT NOT NULL,
	`tml_uid` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`tml_cat` smallint(6) unsigned NOT NULL,
	`tml_type` smallint(6) unsigned NOT NULL DEFAULT 0,
	`tml_related` char(255) NOT NULL DEFAULT '0',
	`tml_memo` mediumtext NOT NULL,
	`tml_img` mediumtext NOT NULL,
	`tml_batch` tinyint NOT NULL,
	`tml_source` tinyint NOT NULL DEFAULT 0,
	`tml_replies` mediumint(8) unsigned NOT NULL,
	`tml_dateline` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `chii_timeline_comments` (
	`tml_pst_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`tml_pst_mid` int(10) unsigned NOT NULL,
	`tml_pst_uid` mediumint(8) unsigned NOT NULL,
	`tml_pst_related` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`tml_pst_dateline` int(10) unsigned NOT NULL,
	`tml_pst_content` mediumtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_tokei_paint` (
	`tp_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`tp_uid` mediumint(8) unsigned NOT NULL,
	`tp_hour` tinyint NOT NULL,
	`tp_min` tinyint NOT NULL,
	`tp_url` varchar(255) NOT NULL,
	`tp_desc` mediumtext NOT NULL,
	`tp_book` tinyint NOT NULL DEFAULT 0,
	`tp_views` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`tp_related_tpc` mediumint(8) unsigned NOT NULL DEFAULT 0,
	`tp_lastupdate` int(10) unsigned NOT NULL,
	`tp_dateline` int(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chii_usergroup` (
	`usr_grp_id` mediumint(8) unsigned AUTO_INCREMENT NOT NULL,
	`usr_grp_name` varchar(255) NOT NULL,
	`usr_grp_perm` mediumtext NOT NULL,
	`usr_grp_dateline` int(10) unsigned NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_type` ON `chii_apps` (`app_type`,`app_creator`);--> statement-breakpoint
CREATE INDEX `app_ban` ON `chii_apps` (`app_ban`);--> statement-breakpoint
CREATE INDEX `app_status` ON `chii_apps` (`app_status`);--> statement-breakpoint
CREATE INDEX `amb_app_id` ON `chii_app_collects` (`app_clt_app_id`,`app_clt_uid`);--> statement-breakpoint
CREATE INDEX `app_clt_uid` ON `chii_app_collects` (`app_clt_uid`);--> statement-breakpoint
CREATE INDEX `blg_cmt_eid` ON `chii_blog_comments` (`blg_pst_mid`);--> statement-breakpoint
CREATE INDEX `blg_cmt_uid` ON `chii_blog_comments` (`blg_pst_uid`);--> statement-breakpoint
CREATE INDEX `blg_pst_related` ON `chii_blog_comments` (`blg_pst_related`);--> statement-breakpoint
CREATE INDEX `entry_type` ON `chii_blog_entry` (`entry_type`,`entry_uid`,`entry_noreply`);--> statement-breakpoint
CREATE INDEX `entry_relate` ON `chii_blog_entry` (`entry_related`);--> statement-breakpoint
CREATE INDEX `entry_public` ON `chii_blog_entry` (`entry_public`);--> statement-breakpoint
CREATE INDEX `entry_dateline` ON `chii_blog_entry` (`entry_dateline`);--> statement-breakpoint
CREATE INDEX `entry_uid` ON `chii_blog_entry` (`entry_uid`,`entry_public`);--> statement-breakpoint
CREATE INDEX `photo_eid` ON `chii_blog_photo` (`photo_eid`);--> statement-breakpoint
CREATE INDEX `crt_role` ON `chii_characters` (`crt_role`);--> statement-breakpoint
CREATE INDEX `crt_lock` ON `chii_characters` (`crt_lock`);--> statement-breakpoint
CREATE INDEX `crt_ban` ON `chii_characters` (`crt_ban`);--> statement-breakpoint
CREATE INDEX `crt_collects` ON `chii_characters` (`crt_collects`);--> statement-breakpoint
CREATE INDEX `crt_comment` ON `chii_characters` (`crt_comment`);--> statement-breakpoint
CREATE INDEX `prsn_id` ON `chii_crt_cast_index` (`prsn_id`);--> statement-breakpoint
CREATE INDEX `subject_id` ON `chii_crt_cast_index` (`subject_id`);--> statement-breakpoint
CREATE INDEX `subject_type_id` ON `chii_crt_cast_index` (`subject_type_id`);--> statement-breakpoint
CREATE INDEX `cmt_crt_id` ON `chii_crt_comments` (`crt_pst_mid`);--> statement-breakpoint
CREATE INDEX `crt_pst_related` ON `chii_crt_comments` (`crt_pst_related`);--> statement-breakpoint
CREATE INDEX `crt_pst_uid` ON `chii_crt_comments` (`crt_pst_uid`);--> statement-breakpoint
CREATE INDEX `rev_crt_id` ON `chii_crt_revisions` (`rev_crt_id`);--> statement-breakpoint
CREATE INDEX `rev_crt_creator` ON `chii_crt_revisions` (`rev_creator`);--> statement-breakpoint
CREATE INDEX `subject_id` ON `chii_crt_subject_index` (`subject_id`);--> statement-breakpoint
CREATE INDEX `crt_type` ON `chii_crt_subject_index` (`crt_type`);--> statement-breakpoint
CREATE INDEX `subject_type_id` ON `chii_crt_subject_index` (`subject_type_id`);--> statement-breakpoint
CREATE INDEX `subject_id` ON `chii_crt_subject_index_bak_240803` (`subject_id`);--> statement-breakpoint
CREATE INDEX `crt_type` ON `chii_crt_subject_index_bak_240803` (`crt_type`);--> statement-breakpoint
CREATE INDEX `subject_type_id` ON `chii_crt_subject_index_bak_240803` (`subject_type_id`);--> statement-breakpoint
CREATE INDEX `club_type` ON `chii_doujin_clubs` (`club_type`,`club_ban`);--> statement-breakpoint
CREATE INDEX `club_name` ON `chii_doujin_clubs` (`club_name`);--> statement-breakpoint
CREATE INDEX `club_pst_mid` ON `chii_doujin_club_comments` (`club_pst_mid`);--> statement-breakpoint
CREATE INDEX `club_pst_related` ON `chii_doujin_club_comments` (`club_pst_related`);--> statement-breakpoint
CREATE INDEX `club_pst_uid` ON `chii_doujin_club_comments` (`club_pst_uid`);--> statement-breakpoint
CREATE INDEX `cf_theme` ON `chii_doujin_club_fields` (`cf_theme`);--> statement-breakpoint
CREATE INDEX `query_followers` ON `chii_doujin_club_members` (`cmb_moderator`,`cmb_cid`,`cmb_deteline`);--> statement-breakpoint
CREATE INDEX `pss_topic_id` ON `chii_doujin_club_posts` (`club_pst_mid`);--> statement-breakpoint
CREATE INDEX `club_pst_related` ON `chii_doujin_club_posts` (`club_pst_related`);--> statement-breakpoint
CREATE INDEX `club_pst_uid` ON `chii_doujin_club_posts` (`club_pst_uid`);--> statement-breakpoint
CREATE INDEX `crb_club_id` ON `chii_doujin_club_related_blog` (`crb_club_id`,`crb_entry_id`);--> statement-breakpoint
CREATE INDEX `crb_entry_id` ON `chii_doujin_club_related_blog` (`crb_entry_id`);--> statement-breakpoint
CREATE INDEX `tml_uid` ON `chii_doujin_club_timeline` (`tml_cid`);--> statement-breakpoint
CREATE INDEX `id_uid` ON `chii_doujin_club_timeline` (`tml_id`,`tml_cid`);--> statement-breakpoint
CREATE INDEX `tpc_subject_id` ON `chii_doujin_club_topics` (`club_tpc_club_id`);--> statement-breakpoint
CREATE INDEX `tpc_display` ON `chii_doujin_club_topics` (`club_tpc_display`);--> statement-breakpoint
CREATE INDEX `uid` ON `chii_doujin_invites` (`uid`);--> statement-breakpoint
CREATE INDEX `pre_uid` ON `chii_doujin_preorder` (`pre_uid`,`pre_type`,`pre_mid`);--> statement-breakpoint
CREATE INDEX `rt_id` ON `chii_doujin_preorder_return` (`rt_id`,`rt_status`);--> statement-breakpoint
CREATE INDEX `rt_pid` ON `chii_doujin_preorder_return` (`rt_pid`);--> statement-breakpoint
CREATE INDEX `subject_cat` ON `chii_doujin_subjects` (`subject_type`,`subject_cat`,`subject_creator`,`subject_ban`);--> statement-breakpoint
CREATE INDEX `subject_sexual` ON `chii_doujin_subjects` (`subject_sexual`,`subject_age_limit`,`subject_original`,`subject_status`);--> statement-breakpoint
CREATE INDEX `subject_lastpost` ON `chii_doujin_subjects` (`subject_lastpost`);--> statement-breakpoint
CREATE INDEX `subject_creator` ON `chii_doujin_subjects` (`subject_creator`);--> statement-breakpoint
CREATE INDEX `subject_dateline` ON `chii_doujin_subjects` (`subject_dateline`);--> statement-breakpoint
CREATE INDEX `subject_type` ON `chii_doujin_subjects` (`subject_type`,`subject_ban`);--> statement-breakpoint
CREATE INDEX `subject_ban` ON `chii_doujin_subjects` (`subject_ban`);--> statement-breakpoint
CREATE INDEX `subject_type` ON `chii_doujin_subject_club_index` (`subject_type`);--> statement-breakpoint
CREATE INDEX `sbj_pst_mid` ON `chii_doujin_subject_comments` (`sbj_pst_mid`);--> statement-breakpoint
CREATE INDEX `sbj_pst_related` ON `chii_doujin_subject_comments` (`sbj_pst_related`);--> statement-breakpoint
CREATE INDEX `sbj_related_photo` ON `chii_doujin_subject_comments` (`sbj_pst_related_photo`);--> statement-breakpoint
CREATE INDEX `sbj_pst_uid` ON `chii_doujin_subject_comments` (`sbj_pst_uid`);--> statement-breakpoint
CREATE INDEX `subject_type` ON `chii_doujin_subject_event_index` (`subject_type`);--> statement-breakpoint
CREATE INDEX `sbj_photo_mid` ON `chii_doujin_subject_photos` (`sbj_photo_mid`);--> statement-breakpoint
CREATE INDEX `sbj_photo_uid` ON `chii_doujin_subject_photos` (`sbj_photo_uid`);--> statement-breakpoint
CREATE INDEX `eden_type` ON `chii_eden` (`eden_type`);--> statement-breakpoint
CREATE INDEX `ep_sort` ON `chii_episodes` (`ep_sort`);--> statement-breakpoint
CREATE INDEX `ep_disc` ON `chii_episodes` (`ep_disc`);--> statement-breakpoint
CREATE INDEX `ep_subject_id` ON `chii_episodes` (`ep_subject_id`);--> statement-breakpoint
CREATE INDEX `ep_lastpost` ON `chii_episodes` (`ep_lastpost`);--> statement-breakpoint
CREATE INDEX `ep_ban` ON `chii_episodes` (`ep_ban`);--> statement-breakpoint
CREATE INDEX `ep_subject_id_2` ON `chii_episodes` (`ep_subject_id`,`ep_ban`,`ep_sort`);--> statement-breakpoint
CREATE INDEX `ep_cmt_crt_id` ON `chii_ep_comments` (`ep_pst_mid`);--> statement-breakpoint
CREATE INDEX `ep_pst_related` ON `chii_ep_comments` (`ep_pst_related`);--> statement-breakpoint
CREATE INDEX `ep_pst_uid` ON `chii_ep_comments` (`ep_pst_uid`);--> statement-breakpoint
CREATE INDEX `rev_sid` ON `chii_ep_revisions` (`rev_sid`,`rev_creator`);--> statement-breakpoint
CREATE INDEX `event_type` ON `chii_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `event_area` ON `chii_events` (`event_city`);--> statement-breakpoint
CREATE INDEX `event_startTime` ON `chii_events` (`event_start_time`);--> statement-breakpoint
CREATE INDEX `event_endTime` ON `chii_events` (`event_end_time`);--> statement-breakpoint
CREATE INDEX `event_lastupdate` ON `chii_events` (`event_lastupdate`);--> statement-breakpoint
CREATE INDEX `event_buildtime` ON `chii_events` (`event_buildtime`);--> statement-breakpoint
CREATE INDEX `event_creator` ON `chii_events` (`event_creator`);--> statement-breakpoint
CREATE INDEX `event_state` ON `chii_events` (`event_state`);--> statement-breakpoint
CREATE INDEX `pst_topic_id` ON `chii_event_posts` (`event_pst_mid`);--> statement-breakpoint
CREATE INDEX `event_pst_related` ON `chii_event_posts` (`event_pst_related`);--> statement-breakpoint
CREATE INDEX `event_pst_uid` ON `chii_event_posts` (`event_pst_uid`);--> statement-breakpoint
CREATE INDEX `tpc_relate_id` ON `chii_event_topics` (`event_tpc_mid`);--> statement-breakpoint
CREATE INDEX `tpc_display` ON `chii_event_topics` (`event_tpc_display`);--> statement-breakpoint
CREATE INDEX `uid` ON `chii_friends` (`frd_uid`);--> statement-breakpoint
CREATE INDEX `frd_fid` ON `chii_friends` (`frd_fid`);--> statement-breakpoint
CREATE INDEX `gdt_app_id` ON `chii_gadgets` (`gdt_app_id`,`gdt_status`);--> statement-breakpoint
CREATE INDEX `grp_nsfw` ON `chii_groups` (`grp_nsfw`);--> statement-breakpoint
CREATE INDEX `pss_topic_id` ON `chii_group_posts` (`grp_pst_mid`);--> statement-breakpoint
CREATE INDEX `grp_pst_related` ON `chii_group_posts` (`grp_pst_related`);--> statement-breakpoint
CREATE INDEX `grp_pst_uid` ON `chii_group_posts` (`grp_pst_uid`);--> statement-breakpoint
CREATE INDEX `grp_tpc_gid` ON `chii_group_topics` (`grp_tpc_gid`);--> statement-breakpoint
CREATE INDEX `grp_tpc_display` ON `chii_group_topics` (`grp_tpc_display`);--> statement-breakpoint
CREATE INDEX `grp_tpc_uid` ON `chii_group_topics` (`grp_tpc_uid`);--> statement-breakpoint
CREATE INDEX `grp_tpc_lastpost` ON `chii_group_topics` (`grp_tpc_lastpost`);--> statement-breakpoint
CREATE INDEX `idx_ban` ON `chii_index` (`idx_ban`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `chii_index` (`idx_type`);--> statement-breakpoint
CREATE INDEX `idx_uid` ON `chii_index` (`idx_uid`);--> statement-breakpoint
CREATE INDEX `idx_collects` ON `chii_index` (`idx_collects`);--> statement-breakpoint
CREATE INDEX `idx_clt_mid` ON `chii_index_collects` (`idx_clt_mid`,`idx_clt_uid`);--> statement-breakpoint
CREATE INDEX `idx_pst_mid` ON `chii_index_comments` (`idx_pst_mid`);--> statement-breakpoint
CREATE INDEX `idx_pst_related` ON `chii_index_comments` (`idx_pst_related`);--> statement-breakpoint
CREATE INDEX `idx_pst_uid` ON `chii_index_comments` (`idx_pst_uid`);--> statement-breakpoint
CREATE INDEX `idx_rlt_rid` ON `chii_index_related` (`idx_rlt_rid`,`idx_rlt_type`);--> statement-breakpoint
CREATE INDEX `idx_rlt_sid` ON `chii_index_related` (`idx_rlt_rid`,`idx_rlt_sid`);--> statement-breakpoint
CREATE INDEX `idx_rlt_sid_2` ON `chii_index_related` (`idx_rlt_sid`);--> statement-breakpoint
CREATE INDEX `idx_rlt_cat` ON `chii_index_related` (`idx_rlt_cat`);--> statement-breakpoint
CREATE INDEX `idx_order` ON `chii_index_related` (`idx_rlt_rid`,`idx_rlt_cat`,`idx_rlt_order`,`idx_rlt_sid`);--> statement-breakpoint
CREATE INDEX `idx_rlt_ban` ON `chii_index_related` (`idx_rlt_ban`);--> statement-breakpoint
CREATE INDEX `isu_type` ON `chii_issues` (`isu_type`,`isu_main_id`,`isu_creator`,`isu_operator`,`isu_status`);--> statement-breakpoint
CREATE INDEX `isu_value` ON `chii_issues` (`isu_value`);--> statement-breakpoint
CREATE INDEX `idx_uid` ON `chii_likes` (`uid`);--> statement-breakpoint
CREATE INDEX `idx_related` ON `chii_likes` (`related_id`);--> statement-breakpoint
CREATE INDEX `type` ON `chii_likes` (`type`,`main_id`,`uid`);--> statement-breakpoint
CREATE INDEX `created_at` ON `chii_likes` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_uid` ON `chii_likes_bak_230331` (`uid`);--> statement-breakpoint
CREATE INDEX `idx_related` ON `chii_likes_bak_230331` (`related_id`);--> statement-breakpoint
CREATE INDEX `type` ON `chii_likes_bak_230331` (`type`,`main_id`,`uid`);--> statement-breakpoint
CREATE INDEX `asw_uid` ON `chii_magi_answered` (`asw_uid`);--> statement-breakpoint
CREATE INDEX `mgm_uid` ON `chii_magi_members` (`mgm_uid`,`mgm_rank`);--> statement-breakpoint
CREATE INDEX `mgm_answered` ON `chii_magi_members` (`mgm_uid`,`mgm_correct`,`mgm_answered`);--> statement-breakpoint
CREATE INDEX `mgm_created` ON `chii_magi_members` (`mgm_created`);--> statement-breakpoint
CREATE INDEX `qst_type` ON `chii_magi_questions` (`qst_type`);--> statement-breakpoint
CREATE INDEX `related` ON `chii_magi_questions` (`qst_relate_type`,`qst_related`);--> statement-breakpoint
CREATE INDEX `qst_ban` ON `chii_magi_questions` (`qst_ban`);--> statement-breakpoint
CREATE INDEX `email` ON `chii_members` (`email`);--> statement-breakpoint
CREATE INDEX `ns_uid_2` ON `chii_network_services` (`ns_uid`);--> statement-breakpoint
CREATE INDEX `nt_uid` ON `chii_notify` (`nt_uid`,`nt_status`,`nt_type`,`nt_related_id`);--> statement-breakpoint
CREATE INDEX `nt_mid` ON `chii_notify` (`nt_mid`);--> statement-breakpoint
CREATE INDEX `nt_from_uid` ON `chii_notify` (`nt_from_uid`);--> statement-breakpoint
CREATE INDEX `ntf_rid` ON `chii_notify_field` (`ntf_rid`);--> statement-breakpoint
CREATE INDEX `ntf_hash` ON `chii_notify_field` (`ntf_hash`);--> statement-breakpoint
CREATE INDEX `type` ON `chii_oauth_access_tokens` (`type`);--> statement-breakpoint
CREATE INDEX `user_expires` ON `chii_oauth_access_tokens` (`user_id`,`expires`);--> statement-breakpoint
CREATE INDEX `client_id` ON `chii_oauth_clients` (`client_id`);--> statement-breakpoint
CREATE INDEX `prsn_type` ON `chii_persons` (`prsn_type`);--> statement-breakpoint
CREATE INDEX `prsn_producer` ON `chii_persons` (`prsn_producer`);--> statement-breakpoint
CREATE INDEX `prsn_mangaka` ON `chii_persons` (`prsn_mangaka`);--> statement-breakpoint
CREATE INDEX `prsn_artist` ON `chii_persons` (`prsn_artist`);--> statement-breakpoint
CREATE INDEX `prsn_seiyu` ON `chii_persons` (`prsn_seiyu`);--> statement-breakpoint
CREATE INDEX `prsn_writer` ON `chii_persons` (`prsn_writer`);--> statement-breakpoint
CREATE INDEX `prsn_illustrator` ON `chii_persons` (`prsn_illustrator`);--> statement-breakpoint
CREATE INDEX `prsn_lock` ON `chii_persons` (`prsn_lock`);--> statement-breakpoint
CREATE INDEX `prsn_ban` ON `chii_persons` (`prsn_ban`);--> statement-breakpoint
CREATE INDEX `prsn_actor` ON `chii_persons` (`prsn_actor`);--> statement-breakpoint
CREATE INDEX `prsn_cat` ON `chii_person_alias` (`prsn_cat`,`prsn_id`);--> statement-breakpoint
CREATE INDEX `prsn_id` ON `chii_person_alias` (`prsn_id`);--> statement-breakpoint
CREATE INDEX `prsn_clt_cat` ON `chii_person_collects` (`prsn_clt_cat`,`prsn_clt_mid`);--> statement-breakpoint
CREATE INDEX `prsn_clt_uid` ON `chii_person_collects` (`prsn_clt_uid`);--> statement-breakpoint
CREATE INDEX `prsn_clt_mid` ON `chii_person_collects` (`prsn_clt_mid`);--> statement-breakpoint
CREATE INDEX `subject_id` ON `chii_person_cs_index` (`subject_id`);--> statement-breakpoint
CREATE INDEX `prsn_position` ON `chii_person_cs_index` (`prsn_position`);--> statement-breakpoint
CREATE INDEX `prsn_id` ON `chii_person_cs_index` (`prsn_id`);--> statement-breakpoint
CREATE INDEX `subject_type_id` ON `chii_person_cs_index` (`subject_type_id`);--> statement-breakpoint
CREATE INDEX `prsn_id` ON `chii_person_fields` (`prsn_id`);--> statement-breakpoint
CREATE INDEX `gender` ON `chii_person_fields` (`gender`);--> statement-breakpoint
CREATE INDEX `bloodtype` ON `chii_person_fields` (`bloodtype`);--> statement-breakpoint
CREATE INDEX `birth_year` ON `chii_person_fields` (`birth_year`);--> statement-breakpoint
CREATE INDEX `birth_mon` ON `chii_person_fields` (`birth_mon`);--> statement-breakpoint
CREATE INDEX `birth_day` ON `chii_person_fields` (`birth_day`);--> statement-breakpoint
CREATE INDEX `prsn_type` ON `chii_person_relationship` (`prsn_type`,`prsn_id`);--> statement-breakpoint
CREATE INDEX `relat_prsn_type` ON `chii_person_relationship` (`relat_prsn_type`,`relat_prsn_id`);--> statement-breakpoint
CREATE INDEX `msgtoid` ON `chii_pms` (`msg_rid`,`msg_folder`,`msg_dateline`);--> statement-breakpoint
CREATE INDEX `msgfromid` ON `chii_pms` (`msg_sid`,`msg_folder`,`msg_dateline`);--> statement-breakpoint
CREATE INDEX `pm_related` ON `chii_pms` (`msg_related`);--> statement-breakpoint
CREATE INDEX `msg_sdeleted` ON `chii_pms` (`msg_sdeleted`,`msg_rdeleted`);--> statement-breakpoint
CREATE INDEX `cmt_prsn_id` ON `chii_prsn_comments` (`prsn_pst_mid`);--> statement-breakpoint
CREATE INDEX `prsn_pst_related` ON `chii_prsn_comments` (`prsn_pst_related`);--> statement-breakpoint
CREATE INDEX `prsn_pst_uid` ON `chii_prsn_comments` (`prsn_pst_uid`);--> statement-breakpoint
CREATE INDEX `ip` ON `chii_regips` (`ip`);--> statement-breakpoint
CREATE INDEX `res_eid` ON `chii_resources` (`res_eid`,`res_type`);--> statement-breakpoint
CREATE INDEX `res_tool` ON `chii_resources` (`res_tool`);--> statement-breakpoint
CREATE INDEX `rev_crt_id` ON `chii_rev_history` (`rev_type`,`rev_mid`);--> statement-breakpoint
CREATE INDEX `rev_crt_creator` ON `chii_rev_history` (`rev_creator`);--> statement-breakpoint
CREATE INDEX `rev_id` ON `chii_rev_history` (`rev_id`,`rev_type`,`rev_creator`);--> statement-breakpoint
CREATE INDEX `rbt_psn_ban` ON `chii_robot_personality` (`rbt_psn_ban`);--> statement-breakpoint
CREATE INDEX `rbt_spc_mid` ON `chii_robot_speech` (`rbt_spc_mid`);--> statement-breakpoint
CREATE INDEX `rbt_spc_ban` ON `chii_robot_speech` (`rbt_spc_ban`);--> statement-breakpoint
CREATE INDEX `searchstring` ON `chii_searchindex` (`searchstring`);--> statement-breakpoint
CREATE INDEX `uid` ON `chii_sessions` (`uid`);--> statement-breakpoint
CREATE INDEX `bloguid` ON `chii_sessions` (`bloguid`);--> statement-breakpoint
CREATE INDEX `ip` ON `chii_sessions` (`ip1`,`ip2`,`ip3`,`ip4`);--> statement-breakpoint
CREATE INDEX `lastactivity` ON `chii_sessions` (`lastactivity`);--> statement-breakpoint
CREATE INDEX `category` ON `chii_stats` (`category`,`type`,`sub_type`);--> statement-breakpoint
CREATE INDEX `subject_name_cn` ON `chii_subjects` (`subject_name_cn`);--> statement-breakpoint
CREATE INDEX `subject_platform` ON `chii_subjects` (`subject_platform`);--> statement-breakpoint
CREATE INDEX `subject_creator` ON `chii_subjects` (`subject_creator`);--> statement-breakpoint
CREATE INDEX `subject_series` ON `chii_subjects` (`subject_series`);--> statement-breakpoint
CREATE INDEX `subject_series_entry` ON `chii_subjects` (`subject_series_entry`);--> statement-breakpoint
CREATE INDEX `subject_airtime` ON `chii_subjects` (`subject_airtime`);--> statement-breakpoint
CREATE INDEX `subject_ban` ON `chii_subjects` (`subject_ban`);--> statement-breakpoint
CREATE INDEX `subject_idx_cn` ON `chii_subjects` (`subject_idx_cn`,`subject_type_id`);--> statement-breakpoint
CREATE INDEX `subject_type_id` ON `chii_subjects` (`subject_type_id`);--> statement-breakpoint
CREATE INDEX `subject_name` ON `chii_subjects` (`subject_name`);--> statement-breakpoint
CREATE INDEX `order_by_name` ON `chii_subjects` (`subject_ban`,`subject_type_id`,`subject_series`,`subject_platform`,`subject_name`);--> statement-breakpoint
CREATE INDEX `browser` ON `chii_subjects` (`subject_ban`,`subject_type_id`,`subject_series`,`subject_platform`);--> statement-breakpoint
CREATE INDEX `subject_nsfw` ON `chii_subjects` (`subject_nsfw`);--> statement-breakpoint
CREATE INDEX `subject_name_cn` ON `chii_subjects_240921` (`subject_name_cn`);--> statement-breakpoint
CREATE INDEX `subject_platform` ON `chii_subjects_240921` (`subject_platform`);--> statement-breakpoint
CREATE INDEX `subject_creator` ON `chii_subjects_240921` (`subject_creator`);--> statement-breakpoint
CREATE INDEX `subject_series` ON `chii_subjects_240921` (`subject_series`);--> statement-breakpoint
CREATE INDEX `subject_series_entry` ON `chii_subjects_240921` (`subject_series_entry`);--> statement-breakpoint
CREATE INDEX `subject_airtime` ON `chii_subjects_240921` (`subject_airtime`);--> statement-breakpoint
CREATE INDEX `subject_ban` ON `chii_subjects_240921` (`subject_ban`);--> statement-breakpoint
CREATE INDEX `subject_idx_cn` ON `chii_subjects_240921` (`subject_idx_cn`,`subject_type_id`);--> statement-breakpoint
CREATE INDEX `subject_type_id` ON `chii_subjects_240921` (`subject_type_id`);--> statement-breakpoint
CREATE INDEX `subject_name` ON `chii_subjects_240921` (`subject_name`);--> statement-breakpoint
CREATE INDEX `order_by_name` ON `chii_subjects_240921` (`subject_ban`,`subject_type_id`,`subject_series`,`subject_platform`,`subject_name`);--> statement-breakpoint
CREATE INDEX `browser` ON `chii_subjects_240921` (`subject_ban`,`subject_type_id`,`subject_series`,`subject_platform`);--> statement-breakpoint
CREATE INDEX `subject_nsfw` ON `chii_subjects_240921` (`subject_nsfw`);--> statement-breakpoint
CREATE INDEX `subject_id` ON `chii_subject_alias` (`subject_id`);--> statement-breakpoint
CREATE INDEX `sort_id` ON `chii_subject_fields` (`field_tid`);--> statement-breakpoint
CREATE INDEX `subject_airtime` ON `chii_subject_fields` (`field_airtime`);--> statement-breakpoint
CREATE INDEX `field_rank` ON `chii_subject_fields` (`field_rank`);--> statement-breakpoint
CREATE INDEX `field_date` ON `chii_subject_fields` (`field_date`);--> statement-breakpoint
CREATE INDEX `field_year_mon` ON `chii_subject_fields` (`field_year`,`field_mon`);--> statement-breakpoint
CREATE INDEX `field_year` ON `chii_subject_fields` (`field_year`);--> statement-breakpoint
CREATE INDEX `query_date` ON `chii_subject_fields` (`field_sid`,`field_date`);--> statement-breakpoint
CREATE INDEX `img_subject_id` ON `chii_subject_imgs` (`img_subject_id`);--> statement-breakpoint
CREATE INDEX `img_nsfw` ON `chii_subject_imgs` (`img_nsfw`,`img_ban`);--> statement-breakpoint
CREATE INDEX `interest_subject_id` ON `chii_subject_interests` (`interest_subject_id`,`interest_type`);--> statement-breakpoint
CREATE INDEX `interest_uid` ON `chii_subject_interests` (`interest_uid`);--> statement-breakpoint
CREATE INDEX `interest_collect_dateline` ON `chii_subject_interests` (`interest_collect_dateline`);--> statement-breakpoint
CREATE INDEX `interest_private` ON `chii_subject_interests` (`interest_private`);--> statement-breakpoint
CREATE INDEX `interest_lasttouch` ON `chii_subject_interests` (`interest_lasttouch`);--> statement-breakpoint
CREATE INDEX `interest_subject_id_2` ON `chii_subject_interests` (`interest_subject_id`);--> statement-breakpoint
CREATE INDEX `interest_type` ON `chii_subject_interests` (`interest_type`);--> statement-breakpoint
CREATE INDEX `interest_subject_type` ON `chii_subject_interests` (`interest_subject_type`);--> statement-breakpoint
CREATE INDEX `interest_rate` ON `chii_subject_interests` (`interest_rate`);--> statement-breakpoint
CREATE INDEX `tag_subject_id` ON `chii_subject_interests` (`interest_subject_type`,`interest_type`,`interest_uid`);--> statement-breakpoint
CREATE INDEX `user_collects` ON `chii_subject_interests` (`interest_subject_type`,`interest_uid`);--> statement-breakpoint
CREATE INDEX `subject_lasttouch` ON `chii_subject_interests` (`interest_subject_id`,`interest_private`,`interest_lasttouch`);--> statement-breakpoint
CREATE INDEX `subject_comment` ON `chii_subject_interests` (`interest_subject_id`,`interest_has_comment`,`interest_private`,`interest_lasttouch`);--> statement-breakpoint
CREATE INDEX `subject_collect` ON `chii_subject_interests` (`interest_subject_id`,`interest_type`,`interest_private`,`interest_collect_dateline`);--> statement-breakpoint
CREATE INDEX `user_collect_type` ON `chii_subject_interests` (`interest_subject_type`,`interest_type`,`interest_uid`,`interest_private`,`interest_collect_dateline`);--> statement-breakpoint
CREATE INDEX `interest_id` ON `chii_subject_interests` (`interest_uid`,`interest_private`);--> statement-breakpoint
CREATE INDEX `subject_rate` ON `chii_subject_interests` (`interest_subject_id`,`interest_rate`,`interest_private`);--> statement-breakpoint
CREATE INDEX `top_subject` ON `chii_subject_interests` (`interest_subject_id`,`interest_subject_type`,`interest_doing_dateline`);--> statement-breakpoint
CREATE INDEX `user_collect_latest` ON `chii_subject_interests` (`interest_subject_type`,`interest_type`,`interest_uid`,`interest_private`);--> statement-breakpoint
CREATE INDEX `interest_type_2` ON `chii_subject_interests` (`interest_type`,`interest_uid`);--> statement-breakpoint
CREATE INDEX `interest_uid_2` ON `chii_subject_interests` (`interest_uid`,`interest_private`,`interest_lasttouch`);--> statement-breakpoint
CREATE INDEX `pss_topic_id` ON `chii_subject_posts` (`sbj_pst_mid`);--> statement-breakpoint
CREATE INDEX `sbj_pst_related` ON `chii_subject_posts` (`sbj_pst_related`);--> statement-breakpoint
CREATE INDEX `sbj_pst_uid` ON `chii_subject_posts` (`sbj_pst_uid`);--> statement-breakpoint
CREATE INDEX `subject_id` ON `chii_subject_rec` (`subject_id`);--> statement-breakpoint
CREATE INDEX `mio_count` ON `chii_subject_rec` (`mio_count`);--> statement-breakpoint
CREATE INDEX `subject1_id` ON `chii_subject_rec_2` (`subject_id`);--> statement-breakpoint
CREATE INDEX `srb_uid` ON `chii_subject_related_blog` (`srb_uid`,`srb_subject_id`,`srb_entry_id`);--> statement-breakpoint
CREATE INDEX `subject_related` ON `chii_subject_related_blog` (`srb_subject_id`);--> statement-breakpoint
CREATE INDEX `rlt_related_subject_type_id` ON `chii_subject_relations` (`rlt_related_subject_type_id`,`rlt_order`);--> statement-breakpoint
CREATE INDEX `rlt_subject_type_id` ON `chii_subject_relations` (`rlt_subject_type_id`);--> statement-breakpoint
CREATE INDEX `rlt_relation_type` ON `chii_subject_relations` (`rlt_relation_type`,`rlt_subject_id`,`rlt_related_subject_id`);--> statement-breakpoint
CREATE INDEX `rlt_related_subject_type_id` ON `chii_subject_relations_bak_240803` (`rlt_related_subject_type_id`,`rlt_order`);--> statement-breakpoint
CREATE INDEX `rlt_subject_type_id` ON `chii_subject_relations_bak_240803` (`rlt_subject_type_id`);--> statement-breakpoint
CREATE INDEX `rlt_relation_type` ON `chii_subject_relations_bak_240803` (`rlt_relation_type`,`rlt_subject_id`,`rlt_related_subject_id`);--> statement-breakpoint
CREATE INDEX `rev_subject_id` ON `chii_subject_revisions` (`rev_subject_id`,`rev_creator`);--> statement-breakpoint
CREATE INDEX `rev_type` ON `chii_subject_revisions` (`rev_type`);--> statement-breakpoint
CREATE INDEX `rev_dateline` ON `chii_subject_revisions` (`rev_dateline`);--> statement-breakpoint
CREATE INDEX `rev_creator` ON `chii_subject_revisions` (`rev_creator`,`rev_id`);--> statement-breakpoint
CREATE INDEX `tpc_subject_id` ON `chii_subject_topics` (`sbj_tpc_subject_id`);--> statement-breakpoint
CREATE INDEX `tpc_display` ON `chii_subject_topics` (`sbj_tpc_display`);--> statement-breakpoint
CREATE INDEX `sbj_tpc_uid` ON `chii_subject_topics` (`sbj_tpc_uid`);--> statement-breakpoint
CREATE INDEX `sbj_tpc_lastpost` ON `chii_subject_topics` (`sbj_tpc_lastpost`,`sbj_tpc_subject_id`,`sbj_tpc_display`);--> statement-breakpoint
CREATE INDEX `tag_type_id` ON `chii_tag_index` (`tag_type_id`);--> statement-breakpoint
CREATE INDEX `tlt_tid` ON `chii_tag_list` (`tlt_tid`,`tlt_uid`,`tlt_sid`);--> statement-breakpoint
CREATE INDEX `tlt_cid` ON `chii_tag_list` (`tlt_cid`);--> statement-breakpoint
CREATE INDEX `tag_cat` ON `chii_tag_neue_index` (`tag_cat`,`tag_type`);--> statement-breakpoint
CREATE INDEX `tag_results` ON `chii_tag_neue_index` (`tag_cat`,`tag_type`,`tag_results`);--> statement-breakpoint
CREATE INDEX `tag_query` ON `chii_tag_neue_index` (`tag_name`,`tag_cat`,`tag_type`);--> statement-breakpoint
CREATE INDEX `tlt_tid` ON `chii_tag_neue_list` (`tlt_tid`,`tlt_uid`,`tlt_cat`,`tlt_type`,`tlt_mid`);--> statement-breakpoint
CREATE INDEX `user_tags` ON `chii_tag_neue_list` (`tlt_uid`,`tlt_cat`,`tlt_mid`,`tlt_tid`);--> statement-breakpoint
CREATE INDEX `subject_tags` ON `chii_tag_neue_list` (`tlt_cat`,`tlt_mid`,`tlt_tid`);--> statement-breakpoint
CREATE INDEX `tag_to_subject` ON `chii_tag_neue_list` (`tlt_tid`,`tlt_mid`);--> statement-breakpoint
CREATE INDEX `tml_uid` ON `chii_timeline` (`tml_uid`);--> statement-breakpoint
CREATE INDEX `tml_cat` ON `chii_timeline` (`tml_cat`);--> statement-breakpoint
CREATE INDEX `tml_batch` ON `chii_timeline` (`tml_batch`);--> statement-breakpoint
CREATE INDEX `query_tml_cat` ON `chii_timeline` (`tml_uid`,`tml_cat`);--> statement-breakpoint
CREATE INDEX `tml_cat_date` ON `chii_timeline` (`tml_uid`,`tml_cat`,`tml_dateline`);--> statement-breakpoint
CREATE INDEX `cmt_tml_id` ON `chii_timeline_comments` (`tml_pst_mid`);--> statement-breakpoint
CREATE INDEX `tml_pst_related` ON `chii_timeline_comments` (`tml_pst_related`);--> statement-breakpoint
CREATE INDEX `tml_pst_uid` ON `chii_timeline_comments` (`tml_pst_uid`);--> statement-breakpoint
CREATE INDEX `tp_uid` ON `chii_tokei_paint` (`tp_uid`,`tp_hour`);--> statement-breakpoint
CREATE INDEX `tp_related_tpc` ON `chii_tokei_paint` (`tp_related_tpc`);
*/