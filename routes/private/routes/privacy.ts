import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as res from '@app/lib/types/res.ts';
import {
  canSetNsfwSubjectPreference,
  formatUserPrivacy,
  patchPrivacyRaw,
  type PrivacyPatch,
  serializePrivacyRaw,
} from '@app/lib/user/privacy.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

const PrivacyValue = t.String({
  enum: ['all', 'friends', 'none'],
});

const PrivacyValueWithoutFriends = t.String({
  enum: ['all', 'none'],
});

const PrivacySettings = t.Object({
  privateMessage: PrivacyValue,
  timelineReply: PrivacyValue,
  timelineCollectReply: PrivacyValue,
  follow: PrivacyValueWithoutFriends,
  mentionNotification: PrivacyValue,
  commentNotification: PrivacyValue,
  friendNotification: PrivacyValueWithoutFriends,
});

const PrivacyPreferences = t.Object({
  showNsfwSubject: t.Boolean(),
  canSetNsfwSubject: t.Boolean(),
  allowNsfw: t.Boolean(),
});

const PrivacyResponse = t.Object({
  settings: PrivacySettings,
  preferences: PrivacyPreferences,
});

const PrivacyPatchSettings = t.Partial(PrivacySettings, { additionalProperties: false });

const PrivacyPatchPreferences = t.Partial(
  t.Object({
    showNsfwSubject: t.Boolean(),
  }),
  { additionalProperties: false },
);

const PrivacyPatchBody = t.Object(
  {
    settings: t.Optional(PrivacyPatchSettings),
    preferences: t.Optional(PrivacyPatchPreferences),
  },
  { additionalProperties: false },
);

type PrivacyPatchBody = Static<typeof PrivacyPatchBody>;

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/privacy',
    {
      schema: {
        summary: 'Get current user privacy settings',
        operationId: 'getPrivacy',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: PrivacyResponse,
          401: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('get privacy')],
    },
    async ({ auth }) => {
      const privacy = await requirePrivacyField(auth.userID);
      return formatUserPrivacy(privacy, {
        userID: auth.userID,
        regTime: auth.regTime,
        permission: auth.permission,
      });
    },
  );

  app.patch<{ Body: PrivacyPatchBody }>(
    '/privacy',
    {
      schema: {
        summary: 'Update current user privacy settings',
        operationId: 'patchPrivacy',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: PrivacyPatchBody,
        response: {
          200: PrivacyResponse,
          400: res.Ref(res.Error),
          401: res.Ref(res.Error),
          403: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('patch privacy')],
    },
    async ({ auth, body }) => {
      const privacy = await requirePrivacyField(auth.userID);

      if (
        body.preferences &&
        Object.hasOwn(body.preferences, 'showNsfwSubject') &&
        !canSetNsfwSubjectPreference({ userID: auth.userID, regTime: auth.regTime })
      ) {
        throw new NotAllowedError('set nsfw subject preference');
      }

      const nextPrivacy = serializePrivacyRaw(patchPrivacyRaw(privacy, body as PrivacyPatch));
      await db
        .update(schema.chiiUserFields)
        .set({ privacy: nextPrivacy })
        .where(op.eq(schema.chiiUserFields.uid, auth.userID));

      return formatUserPrivacy(nextPrivacy, {
        userID: auth.userID,
        regTime: auth.regTime,
        permission: auth.permission,
      });
    },
  );
}

async function requirePrivacyField(userID: number): Promise<string> {
  const [field] = await db
    .select({ privacy: schema.chiiUserFields.privacy })
    .from(schema.chiiUserFields)
    .where(op.eq(schema.chiiUserFields.uid, userID))
    .limit(1);

  if (!field) {
    throw new UnexpectedNotFoundError(`user field ${userID}`);
  }

  return field.privacy;
}
