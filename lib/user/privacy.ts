import { db, op, schema } from '@app/drizzle';
import type { Permission } from '@app/lib/user/perm.ts';
import { decode } from '@app/lib/utils/index.ts';

export const PrivacyValue = Object.freeze({
  All: 'all',
  Friends: 'friends',
  None: 'none',
} as const);

export type PrivacyValue = (typeof PrivacyValue)[keyof typeof PrivacyValue];
export type BinaryPrivacyValue = typeof PrivacyValue.All | typeof PrivacyValue.None;

export const PrivacySettingKey = Object.freeze({
  PrivateMessage: 'privateMessage',
  MentionNotification: 'mentionNotification',
  CommentNotification: 'commentNotification',
  FriendNotification: 'friendNotification',
  TimelineReply: 'timelineReply',
  TimelineCollectReply: 'timelineCollectReply',
  Follow: 'follow',
} as const);

export type PrivacySettingKey = (typeof PrivacySettingKey)[keyof typeof PrivacySettingKey];

export interface PrivacySettings {
  privateMessage: PrivacyValue;
  mentionNotification: PrivacyValue;
  commentNotification: PrivacyValue;
  friendNotification: BinaryPrivacyValue;
  timelineReply: PrivacyValue;
  timelineCollectReply: PrivacyValue;
  follow: BinaryPrivacyValue;
}

export interface PrivacyPreferences {
  showNsfwSubject: boolean;
  canSetNsfwSubject: boolean;
  allowNsfw: boolean;
}

export interface UserPrivacy {
  settings: PrivacySettings;
  preferences: PrivacyPreferences;
}

export interface PrivacyPatch {
  settings?: Partial<{
    privateMessage: PrivacyValue;
    mentionNotification: PrivacyValue;
    commentNotification: PrivacyValue;
    friendNotification: BinaryPrivacyValue;
    timelineReply: PrivacyValue;
    timelineCollectReply: PrivacyValue;
    follow: BinaryPrivacyValue;
  }>;
  preferences?: Partial<{
    showNsfwSubject: boolean;
  }>;
}

interface PrivacyTypeConfig {
  id: number;
  defaultValue: PrivacyValue;
  allowedValues: readonly PrivacyValue[];
}

type PrivacyRaw = Record<string, unknown>;

const nsfwRestrictedUserIDs = new Set([
  873244, // by @everpcpc
]);

const nsfwSubjectPreferenceKey = 'show_nsfw_subject';
const nsfwEligibilitySeconds = 60 * 60 * 24 * 60;

const settingConfigs: Record<PrivacySettingKey, PrivacyTypeConfig> = {
  [PrivacySettingKey.PrivateMessage]: {
    id: 1,
    defaultValue: PrivacyValue.All,
    allowedValues: [PrivacyValue.All, PrivacyValue.Friends, PrivacyValue.None],
  },
  [PrivacySettingKey.MentionNotification]: {
    id: 20,
    defaultValue: PrivacyValue.All,
    allowedValues: [PrivacyValue.All, PrivacyValue.Friends, PrivacyValue.None],
  },
  [PrivacySettingKey.CommentNotification]: {
    id: 21,
    defaultValue: PrivacyValue.All,
    allowedValues: [PrivacyValue.All, PrivacyValue.Friends, PrivacyValue.None],
  },
  [PrivacySettingKey.FriendNotification]: {
    id: 23,
    defaultValue: PrivacyValue.All,
    allowedValues: [PrivacyValue.All, PrivacyValue.None],
  },
  [PrivacySettingKey.TimelineReply]: {
    id: 30,
    defaultValue: PrivacyValue.All,
    allowedValues: [PrivacyValue.All, PrivacyValue.Friends, PrivacyValue.None],
  },
  [PrivacySettingKey.TimelineCollectReply]: {
    id: 32,
    defaultValue: PrivacyValue.Friends,
    allowedValues: [PrivacyValue.All, PrivacyValue.Friends, PrivacyValue.None],
  },
  [PrivacySettingKey.Follow]: {
    id: 40,
    defaultValue: PrivacyValue.All,
    allowedValues: [PrivacyValue.All, PrivacyValue.None],
  },
};

const settingOrder = [
  PrivacySettingKey.PrivateMessage,
  PrivacySettingKey.TimelineReply,
  PrivacySettingKey.TimelineCollectReply,
  PrivacySettingKey.Follow,
  PrivacySettingKey.MentionNotification,
  PrivacySettingKey.CommentNotification,
  PrivacySettingKey.FriendNotification,
] as const;

const privacyValueToID: Record<PrivacyValue, number> = {
  [PrivacyValue.All]: 0,
  [PrivacyValue.Friends]: 1,
  [PrivacyValue.None]: 2,
};

const privacyIDToValue: Record<number, PrivacyValue> = {
  0: PrivacyValue.All,
  1: PrivacyValue.Friends,
  2: PrivacyValue.None,
};

export async function fetchPrivacyByUserID(userID: number): Promise<string> {
  const [field] = await db
    .select({ privacy: schema.chiiUserFields.privacy })
    .from(schema.chiiUserFields)
    .where(op.eq(schema.chiiUserFields.uid, userID))
    .limit(1);

  return field?.privacy ?? '';
}

export function parsePrivacyRaw(privacy: string): PrivacyRaw {
  if (!privacy) {
    return {};
  }

  try {
    const raw = decode(privacy);
    if (isPlainRecord(raw)) {
      return raw;
    }
  } catch {
    return {};
  }

  return {};
}

export function serializePrivacyRaw(raw: PrivacyRaw): string {
  return JSON.stringify(raw);
}

export function formatUserPrivacy(
  privacy: string,
  {
    userID = 0,
    regTime = 0,
    permission = {},
    now = currentUnixSeconds(),
  }: {
    userID?: number;
    regTime?: number;
    permission?: Readonly<Permission>;
    now?: number;
  } = {},
): UserPrivacy {
  const raw = parsePrivacyRaw(privacy);
  const showNsfwSubject = isNsfwSubjectPreferenceEnabled(raw);
  const canSetNsfwSubject = canSetNsfwSubjectPreference({ userID, regTime, now });

  return {
    settings: readPrivacySettings(raw),
    preferences: {
      showNsfwSubject,
      canSetNsfwSubject,
      allowNsfw: canViewNsfwSubject({
        showNsfwSubject,
        userID,
        regTime,
        permission,
        now,
      }),
    },
  };
}

export function patchPrivacyRaw(privacy: string, patch: PrivacyPatch): PrivacyRaw {
  const raw = parsePrivacyRaw(privacy);
  const next: PrivacyRaw = { ...raw };

  if (patch.settings) {
    for (const key of settingOrder) {
      if (!hasOwn(patch.settings, key)) {
        continue;
      }
      const value = patch.settings[key];
      if (value === undefined) {
        continue;
      }
      assertAllowedPrivacyValue(key, value);
      next[String(settingConfigs[key].id)] = privacyValueToID[value];
    }
  }

  if (patch.preferences && hasOwn(patch.preferences, 'showNsfwSubject')) {
    next[nsfwSubjectPreferenceKey] = patch.preferences.showNsfwSubject ? 1 : 0;
  }

  return next;
}

export function readPrivacySetting(privacy: string, key: PrivacySettingKey): PrivacyValue {
  return readPrivacySettingFromRaw(parsePrivacyRaw(privacy), key);
}

export function isNsfwSubjectPreferenceEnabled(privacy: string | PrivacyRaw): boolean {
  const raw = typeof privacy === 'string' ? parsePrivacyRaw(privacy) : privacy;
  return toInteger(raw[nsfwSubjectPreferenceKey]) === 1;
}

export function canSetNsfwSubjectPreference({
  userID,
  regTime,
  now = currentUnixSeconds(),
}: {
  userID: number;
  regTime: number;
  now?: number;
}): boolean {
  return (
    userID > 0 &&
    regTime > 0 &&
    !nsfwRestrictedUserIDs.has(userID) &&
    now >= regTime + nsfwEligibilitySeconds
  );
}

export function canViewNsfwSubject({
  showNsfwSubject,
  userID,
  regTime,
  permission = {},
  now = currentUnixSeconds(),
}: {
  showNsfwSubject: boolean;
  userID: number;
  regTime: number;
  permission?: Readonly<Permission>;
  now?: number;
}): boolean {
  return (
    showNsfwSubject &&
    canSetNsfwSubjectPreference({ userID, regTime, now }) &&
    !nsfwRestrictedUserIDs.has(userID) &&
    !permission.ban_visit &&
    !permission.user_ban
  );
}

function readPrivacySettings(raw: PrivacyRaw): PrivacySettings {
  return {
    privateMessage: readPrivacySettingFromRaw(raw, PrivacySettingKey.PrivateMessage),
    timelineReply: readPrivacySettingFromRaw(raw, PrivacySettingKey.TimelineReply),
    timelineCollectReply: readPrivacySettingFromRaw(raw, PrivacySettingKey.TimelineCollectReply),
    follow: readPrivacySettingFromRaw(raw, PrivacySettingKey.Follow) as BinaryPrivacyValue,
    mentionNotification: readPrivacySettingFromRaw(raw, PrivacySettingKey.MentionNotification),
    commentNotification: readPrivacySettingFromRaw(raw, PrivacySettingKey.CommentNotification),
    friendNotification: readPrivacySettingFromRaw(
      raw,
      PrivacySettingKey.FriendNotification,
    ) as BinaryPrivacyValue,
  };
}

function readPrivacySettingFromRaw(raw: PrivacyRaw, key: PrivacySettingKey): PrivacyValue {
  const config = settingConfigs[key];
  const rawValue = toInteger(raw[String(config.id)]);
  const value = rawValue === undefined ? undefined : privacyIDToValue[rawValue];

  if (value && config.allowedValues.includes(value)) {
    return value;
  }

  return config.defaultValue;
}

function assertAllowedPrivacyValue(key: PrivacySettingKey, value: PrivacyValue): void {
  const config = settingConfigs[key];
  if (!config.allowedValues.includes(value)) {
    throw new TypeError(`${key} does not allow ${value}`);
  }
}

function toInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    if (!/^-?\d+$/.test(value)) {
      return;
    }
    const n = Number(value);
    if (Number.isInteger(n)) {
      return n;
    }
  }
}

function isPlainRecord(value: unknown): value is PrivacyRaw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.hasOwn(value, key);
}

function currentUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
