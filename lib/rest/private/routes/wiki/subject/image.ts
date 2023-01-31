import * as crypto from 'node:crypto';

import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '@app/lib/auth';
import { BadRequestError, NotFoundError, UnexpectedNotFoundError } from '@app/lib/error';
import { fileExtension, SupportedImageExtension, uploadSubjectImage } from '@app/lib/image';
import { LikeRepo, SubjectImageRepo } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import { Like } from '@app/lib/orm/entity';
import { requireLogin, requirePermission } from '@app/lib/rest/hooks/pre-handler';
import type { App } from '@app/lib/rest/type';
import imaginary from '@app/lib/services/imaginary';
import { SandBox } from '@app/lib/subject';
import * as Subject from '@app/lib/subject';
import * as res from '@app/lib/types/res';

export function setup(app: App) {
  app.get(
    '/subjects/:subjectID/covers',
    {
      schema: {
        operationId: 'listSubjectCovers',
        params: t.Object({
          subjectID: t.Integer({ examples: [184017] }),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.Integer(),
                url: t.String(),
                creator: res.User,
              }),
            ),
          }),
        },
      },
      preHandler: [requireLogin('list subject covers')],
    },
    async ({ params: { subjectID } }) => {
      if (!SandBox.has(subjectID)) {
        throw new BadRequestError('暂时只能修改沙盒条目');
      }

      const images = await SubjectImageRepo.find({
        where: { subjectID, ban: 0 },
        order: { id: 'asc' },
      });
      const users = await orm.fetchUsers(images.map((x) => x.uid));

      return {
        data: images.map((x) => {
          const u = users[x.uid];
          if (!u) {
            throw new UnexpectedNotFoundError(`user ${x.uid}`);
          }

          return {
            id: x.id,
            url: 'https://lain.bgm.tv/r/400/pic/cover/l/' + x.target,
            creator: res.toResUser(u),
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
        params: t.Object({
          subjectID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
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
      if (!SandBox.has(subjectID)) {
        throw new BadRequestError('暂时只能修改沙盒条目');
      }
      const raw = Buffer.from(content, 'base64');
      // 4mb
      if (raw.length > 4 * 1024 * 1024) {
        throw new BadRequestError('file too large');
      }

      // validate image
      const res = await imaginary.info(raw);
      const format = res.type;

      if (!format) {
        throw new BadRequestError("not valid image, can' get image format");
      }

      const ext = fileExtension(format);
      if (!ext) {
        throw new BadRequestError(
          `not valid image, only support ${SupportedImageExtension.join(', ')}`,
        );
      }

      const h = crypto.createHash('blake2b512').update(raw).digest('base64url').slice(0, 32);

      const filename = `raw/${h.slice(0, 2)}/${h.slice(2, 4)}/${subjectID}_${h.slice(4)}.${ext}`;

      const s = await orm.fetchSubject(subjectID);
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
        description: '为条目封面投票',
        params: t.Object({
          subjectID: t.Integer({ exclusiveMinimum: 0 }),
          imageID: t.Integer({ exclusiveMinimum: 0 }),
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

      await LikeRepo.upsert(
        {
          type: Like.TYPE_SUBJECT_COVER,
          relatedID: imageID,
          uid: auth.userID,
          createdAt: new Date(),
        },
        { conflictPaths: [], skipUpdateIfNoValuesChanged: false },
      );

      await Subject.onSubjectVote(subjectID);

      return {};
    },
  );

  app.delete(
    '/subjects/:subjectID/covers/:imageID/vote',
    {
      schema: {
        operationId: 'unvoteSubjectCover',
        description: '撤消条目封面投票',
        params: t.Object({
          subjectID: t.Integer({ exclusiveMinimum: 0 }),
          imageID: t.Integer({ exclusiveMinimum: 0 }),
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
      const result = await LikeRepo.update(
        {
          type: Like.TYPE_SUBJECT_COVER,
          uid: auth.userID,
          relatedID: imageID,
          ban: 0,
        },
        { ban: 1 },
      );

      if (result.affected) {
        await Subject.onSubjectVote(subjectID);
      }

      return {};
    },
  );
}
