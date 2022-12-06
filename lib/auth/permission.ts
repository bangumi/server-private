import * as php from 'php-serialize';
import NodeCache from 'node-cache';

import prisma from '../prisma';
import { logger } from '../logger';

const cache = new NodeCache({ stdTTL: 60 * 10 });

export interface Permission {
  user_list?: boolean;
  manage_user_group?: boolean;
  manage_user_photo?: boolean;
  manage_topic_state?: boolean;
  manage_report?: boolean;
  user_ban?: boolean;
  manage_user?: boolean;
  user_group?: boolean;
  user_wiki_approve?: boolean;
  doujin_subject_erase?: boolean;
  user_wiki_apply?: boolean;
  doujin_subject_lock?: boolean;
  subject_edit?: boolean;
  subject_lock?: boolean;
  subject_refresh?: boolean;
  subject_related?: boolean;
  subject_merge?: boolean;
  subject_erase?: boolean;
  subject_cover_lock?: boolean;
  subject_cover_erase?: boolean;
  mono_edit?: boolean;
  mono_lock?: boolean;
  mono_merge?: boolean;
  mono_erase?: boolean;
  ep_edit?: boolean;
  ep_move?: boolean;
  ep_merge?: boolean;
  ep_lock?: boolean;
  ep_erase?: boolean;
  report?: boolean;
  manage_app?: boolean;
  app_erase?: boolean;
}

export async function getPermission(userGroup: number): Promise<Readonly<Permission>> {
  const cached = cache.get(userGroup);
  if (cached) {
    return cached;
  }

  const permission = await prisma.chii_usergroup.findFirst({ where: { usr_grp_id: userGroup } });
  if (!permission) {
    logger.warn("can't find permission for userGroup %d", userGroup);
    return {};
  }

  const p = Object.freeze(
    Object.fromEntries(
      Object.entries(
        php.unserialize(permission.usr_grp_perm) as Record<keyof Permission, string>,
      ).map(([key, value]) => [key, value === '1']),
    ),
  );

  cache.set(userGroup, p);

  return p;
}
