import * as crypto from 'node:crypto';

import { createError } from '@fastify/error';
import { Type as t } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import { chiiLikes } from '@app/drizzle/schema.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { imageDomain } from '@app/lib/config.ts';
import { NotFoundError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import { ImageTypeCanBeUploaded, uploadSubjectImage } from '@app/lib/image/index.ts';
import { LikeType } from '@app/lib/like.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import { SubjectImageRepo } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import imaginary from '@app/lib/services/imaginary.ts';
import * as Subject from '@app/lib/subject/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';
import { errorResponses } from '@app/lib/types/res.ts';
import { requireLogin, requirePermission } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

const ImageFileTooLarge = createError(
  'IMAGE_FILE_TOO_LARGE',
  'uploaded image file is too large',
  StatusCodes.BAD_REQUEST,
);
const UnsupportedImageFormat = createError(
  'IMAGE_FORMAT_NOT_SUPPORT',
  `not valid image file, only support ${ImageTypeCanBeUploaded.join(', ')}`,
  StatusCodes.BAD_REQUEST,
);

const sizeLimit = 4 * 1024 * 1024;

export function setup(app: App) {
  app.get(
    '/subjects/:subjectID/covers',
    {
      schema: {
        operationId: 'listSubjectCovers',
        tags: [Tag.Wiki],
        params: t.Object({
          subjectID: t.Integer({ examples: [184017] }),
        }),
        response: {
          200: t.Object({
            current: t.Optional(
              t.Object({
                thumbnail: t.String(),
                raw: t.String(),
                id: t.Integer(),
              }),
            ),
            covers: t.Array(
              t.Object({
                id: t.Integer(),
                thumbnail: t.String(),
                raw: t.String(),
                creator: res.SlimUser,
                voted: t.Boolean(),
              }),
            ),
          }),
        },
      },
      preHandler: [requireLogin('list subject covers')],
    },
    async ({ params: { subjectID }, auth }) => {
      const s = await orm.fetchSubjectByID(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      if (s.locked) {
        throw new NotAllowedError(`subject ${subjectID} is locked`);
      }

      const images = await SubjectImageRepo.find({
        where: { subjectID, ban: 0 },
        order: { id: 'asc' },
      });

      if (images.length === 0) {
        return {
          current: undefined,
          covers: [],
        };
      }

      const users = await orm.fetchUsers(images.map((x) => x.uid));
      const likes = lo.groupBy(
        await db
          .select()
          .from(chiiLikes)
          .where(
            op.and(
              op.inArray(
                chiiLikes.relatedID,
                images.map((x) => x.id),
              ),
              op.eq(chiiLikes.type, LikeType.SubjectCover),
              op.eq(chiiLikes.uid, auth.userID),
              op.eq(chiiLikes.deleted, 0),
            ),
          ),
        (x) => x.relatedID,
      );

      const currentUpload = s.image ? images.find((x) => x.target === s.image) : undefined;

      if (s.image && !currentUpload) {
        throw new UnexpectedNotFoundError(`can't find image uploading for image ${s.image}`);
      }

      return {
        current: currentUpload
          ? {
              thumbnail: `https://${imageDomain}/r/400/pic/cover/l/${currentUpload.target}`,
              raw: `https://${imageDomain}/pic/cover/l/${currentUpload.target}`,
              id: currentUpload.id,
            }
          : undefined,
        covers: images.map((x) => {
          const u = users[x.uid];
          if (!u) {
            throw new UnexpectedNotFoundError(`user ${x.uid}`);
          }

          return {
            id: x.id,
            thumbnail: `https://${imageDomain}/r/400/pic/cover/l/${x.target}`,
            raw: `https://${imageDomain}/pic/cover/l/${x.target}`,
            creator: convert.oldToUser(u),
            voted: x.id in likes,
          };
        }),
      };
    },
  );

  app.post(
    '/subjects/:subjectID/covers',
    {
      schema: {
        operationId: 'uploadSubjectCover',
        tags: [Tag.Wiki],
        description: `需要 \`subjectWikiEdit\` 权限`,
        params: t.Object({
          subjectID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          ...errorResponses(
            ImageFileTooLarge(),
            UnsupportedImageFormat(),
            new NotAllowedError('non sandbox subject'),
          ),
        },
        body: t.Object({
          content: t.String({
            format: 'byte',
            description: 'base64 encoded raw bytes, 4mb size limit on **decoded** size',
          }),
        }),
      },
      preHandler: [
        requireLogin('upload a subject cover'),
        requirePermission('upload subject cover', (auth) => auth.permission.subject_edit ?? false),
      ],
    },
    async ({ body: { content }, auth, params: { subjectID } }) => {
      let raw = Buffer.from(content, 'base64');
      // 4mb
      if (raw.length > sizeLimit) {
        throw new ImageFileTooLarge();
      }

      // validate image
      const resp = await imaginary.info(raw);
      const format = resp.type;

      if (!format) {
        throw new UnsupportedImageFormat();
      }

      if (!ImageTypeCanBeUploaded.includes(format)) {
        throw new UnsupportedImageFormat();
      }

      // convert webp to jpeg
      let ext = format;
      if (format === 'webp') {
        raw = await imaginary.convert(raw, { format: 'jpeg' });
        if (raw.length > sizeLimit) {
          throw new ImageFileTooLarge();
        }
        ext = 'jpeg';
      }

      // for example "36b8f84d-df4e-4d49-b662-bcde71a8764f"
      const h = crypto.randomUUID();

      // for example raw/36/b8/${subject_id}_f84d-df4e-4d49-b662-bcde71a8764f.jpg"
      const filename = `raw/${h.slice(0, 2)}/${h.slice(2, 4)}/${subjectID}_${h}.${ext}`;

      const s = await orm.fetchSubjectByID(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
      }
      if (s.redirect) {
        throw new NotAllowedError('edit a locked subject');
      }

      await uploadSubjectImage(filename, raw);

      await Subject.uploadCover({ subjectID: subjectID, filename, uid: auth.userID });

      return {};
    },
  );

  app.post(
    '/subjects/:subjectID/covers/:imageID/vote',
    {
      schema: {
        operationId: 'voteSubjectCover',
        tags: [Tag.Wiki],
        description: `需要 \`subjectWikiEdit\` 权限`,
        summary: '为条目封面投票',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
          imageID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [
        requireLogin('vote for subject cover'),
        requirePermission('vote for subject cover', (auth) => auth.permission.subject_edit),
      ],
    },
    async ({ params: { subjectID, imageID }, auth }) => {
      const image = await SubjectImageRepo.findOneBy({ subjectID, id: imageID, ban: 0 });
      if (!image) {
        throw new NotFoundError(`image(id=${imageID}, subjectID=${subjectID})`);
      }

      await db.insert(chiiLikes).values({
        type: LikeType.SubjectCover,
        relatedID: imageID,
        uid: auth.userID,
        createdAt: DateTime.now().toUnixInteger(),
        deleted: 0,
      });

      await Subject.onSubjectVote(subjectID);

      return {};
    },
  );

  app.delete(
    '/subjects/:subjectID/covers/:imageID/vote',
    {
      schema: {
        operationId: 'unvoteSubjectCover',
        tags: [Tag.Wiki],
        summary: '撤消条目封面投票',
        description: `需要 \`subjectWikiEdit\` 权限`,
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
          imageID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [
        requireLogin('vote for subject cover'),
        requirePermission('vote for subject cover', (auth) => auth.permission.subject_edit),
      ],
    },
    async ({ params: { subjectID, imageID }, auth }) => {
      const [result] = await db
        .update(chiiLikes)
        .set({ deleted: 1 })
        .where(
          op.and(
            op.eq(chiiLikes.type, LikeType.SubjectCover),
            op.eq(chiiLikes.uid, auth.userID),
            op.eq(chiiLikes.relatedID, imageID),
            op.eq(chiiLikes.deleted, 0),
          ),
        );

      if (result.affectedRows) {
        await Subject.onSubjectVote(subjectID);
      }

      return {};
    },
  );
}
