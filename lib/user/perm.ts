import Keyv from 'keyv';

import { db, op, schema } from '@app/drizzle';
import { logger } from '@app/lib/logger.ts';
import { decode } from '@app/lib/utils';

export interface Permission {
  app_erase?: boolean;
  ban_post?: boolean;
  ban_subject_interest?: boolean;
  ban_visit?: boolean;
  doujin_subject_erase?: boolean;
  doujin_subject_lock?: boolean;
  ep_edit?: boolean;
  ep_erase?: boolean;
  ep_lock?: boolean;
  ep_merge?: boolean;
  ep_move?: boolean;
  manage_app?: boolean;
  manage_report?: boolean;
  manage_topic_state?: boolean;
  manage_user?: boolean;
  manage_user_group?: boolean;
  manage_user_photo?: boolean;
  mono_edit?: boolean;
  mono_erase?: boolean;
  mono_lock?: boolean;
  mono_merge?: boolean;
  report?: boolean;
  subject_cover_erase?: boolean;
  subject_cover_lock?: boolean;
  subject_edit?: boolean;
  subject_erase?: boolean;
  subject_lock?: boolean;
  subject_merge?: boolean;
  subject_refresh?: boolean;
  subject_related?: boolean;
  user_ban?: boolean;
  user_group?: boolean;
  user_list?: boolean;
  user_wiki_apply?: boolean;
  user_wiki_approve?: boolean;
}

const defaultPermission: Permission = {
  ban_post: true,
  ban_visit: true,
};

const permissionCache = new Keyv({ ttl: 60 * 10 });

/** Cached locally */
export async function fetchPermission(userGroup: number): Promise<Readonly<Permission>> {
  const cached = await permissionCache.get<Permission>(userGroup.toString());
  if (cached) {
    return cached;
  }

  const [data] = await db
    .select()
    .from(schema.chiiUsergroup)
    .where(op.eq(schema.chiiUsergroup.id, userGroup))
    .limit(1);
  if (!data) {
    logger.warn("can't find permission for userGroup %d", userGroup);
    return Object.freeze({ ...defaultPermission });
  }
  if (!data.perm) {
    return Object.freeze({ ...defaultPermission });
  }

  const permission = Object.freeze(decodePermission(data.perm));
  await permissionCache.set<Permission>(userGroup.toString(), permission);
  return permission;
}

function decodePermission(raw: string): Permission {
  const fields = decode(raw) as Record<string, unknown> | null;
  return Object.fromEntries(
    Object.entries(fields ?? {}).flatMap(([key, value]) => {
      if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'number' ||
        typeof value === 'string'
      ) {
        return [[key, Boolean(value) && value !== '0']];
      }
      return [];
    }),
  );
}

export function mergeUserPermission(
  group: Readonly<Permission>,
  acl: string,
): Readonly<Permission> {
  return { ...group, ...decodePermission(acl) };
}

export async function fetchUserPermission(user: {
  groupid: number;
  acl: string;
}): Promise<Readonly<Permission>> {
  return mergeUserPermission(await fetchPermission(user.groupid), user.acl);
}
