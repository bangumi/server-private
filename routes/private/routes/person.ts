import { Type as t } from '@sinclair/typebox';

import { db, op, type orm, schema } from '@app/drizzle';
import { CommentWithState } from '@app/lib/comment.ts';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type.ts';

function toPersonSubjectRelation(relation: orm.IPersonSubject): res.ISubjectStaffPosition {
  return {
    summary: relation.summary,
    appearEps: relation.appearEps,
    type: convert.toSubjectStaffPositionType(relation.subjectType, relation.position),
  };
}

function toPersonCharacter(
  character: orm.ICharacter,
  relations: res.ICharacterSubjectRelation[],
): res.IPersonCharacter {
  return {
    character: convert.toSlimCharacter(character),
    relations: relations,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const comment = new CommentWithState(schema.chiiPrsnComments);

  app.get(
    '/persons/:personID',
    {
      schema: {
        summary: '获取人物',
        operationId: 'getPerson',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.Person),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({ auth, params: { personID } }) => {
      const [data] = await db
        .select()
        .from(schema.chiiPersons)
        .where(
          op.and(
            op.eq(schema.chiiPersons.id, personID),
            op.ne(schema.chiiPersons.ban, 1),
            auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
          ),
        );
      if (!data) {
        throw new NotFoundError(`person ${personID}`);
      }
      return convert.toPerson(data);
    },
  );

  app.get(
    '/persons/:personID/works',
    {
      schema: {
        summary: '获取人物的参与作品',
        operationId: 'getPersonWorks',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          subjectType: t.Optional(req.Ref(req.SubjectType)),
          position: t.Optional(t.Integer({ description: '职位' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.PersonWork)),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({
      auth,
      params: { personID },
      query: { subjectType, position, limit = 20, offset = 0 },
    }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonSubjects.personID, personID),
        subjectType ? op.eq(schema.chiiPersonSubjects.subjectType, subjectType) : undefined,
        position ? op.eq(schema.chiiPersonSubjects.position, position) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiPersonSubjects.subjectID) })
        .from(schema.chiiPersonSubjects)
        .where(condition);
      const data = await db
        .select({ sid: schema.chiiPersonSubjects.subjectID })
        .from(schema.chiiPersonSubjects)
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiPersonSubjects.subjectID, schema.chiiSubjectFields.id),
        )
        .where(condition)
        .groupBy(schema.chiiPersonSubjects.subjectID)
        .orderBy(op.desc(schema.chiiSubjectFields.date))
        .limit(limit)
        .offset(offset);
      const subjectIDs = data.map((d) => d.sid);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs, auth.allowNsfw);
      const relations = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .where(
          op.and(
            op.inArray(schema.chiiPersonSubjects.subjectID, subjectIDs),
            op.eq(schema.chiiPersonSubjects.personID, personID),
            position ? op.eq(schema.chiiPersonSubjects.position, position) : undefined,
          ),
        );
      const relationsMap = new Map<number, res.ISubjectStaffPosition[]>();
      for (const r of relations) {
        const relations = relationsMap.get(r.subjectID) || [];
        relations.push(toPersonSubjectRelation(r));
        relationsMap.set(r.subjectID, relations);
      }
      const works: res.IPersonWork[] = [];
      for (const sid of subjectIDs) {
        const subject = subjects[sid];
        const positions = relationsMap.get(sid) || [];
        if (!subject) {
          continue;
        }
        works.push({ subject, positions });
      }
      return {
        total: count,
        data: works,
      };
    },
  );

  app.get(
    '/persons/:personID/casts',
    {
      schema: {
        summary: '获取人物的出演角色',
        operationId: 'getPersonCasts',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          subjectType: t.Optional(req.Ref(req.SubjectType)),
          type: t.Optional(t.Integer({ description: '角色出场类型: 主角，配角，客串' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.PersonCharacter)),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({
      auth,
      params: { personID },
      query: { subjectType, type, limit = 20, offset = 0 },
    }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiCharacterCasts.personID, personID),
        subjectType ? op.eq(schema.chiiCharacterCasts.subjectType, subjectType) : undefined,
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.ne(schema.chiiCharacters.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiCharacterCasts.characterID) })
        .from(schema.chiiCharacterCasts)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacters.id),
        )
        .innerJoin(
          schema.chiiCharacterSubjects,
          op.and(
            op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacterSubjects.characterID),
            op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiCharacterSubjects.subjectID),
          ),
        )
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiCharacterCasts)
        .innerJoin(
          schema.chiiCharacters,
          op.and(op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacters.id)),
        )
        .innerJoin(
          schema.chiiCharacterSubjects,
          op.and(
            op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacterSubjects.characterID),
            op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiCharacterSubjects.subjectID),
          ),
        )
        .where(condition)
        .groupBy(schema.chiiCharacterCasts.characterID)
        .orderBy(op.desc(schema.chiiCharacterCasts.characterID))
        .limit(limit)
        .offset(offset);
      const characterIDs = data.map((d) => d.chii_crt_cast_index.characterID);
      const subjects = await fetcher.fetchCastsByPersonAndCharacterIDs(
        personID,
        characterIDs,
        subjectType,
        type,
        auth.allowNsfw,
      );
      const characters = data.map((d) =>
        toPersonCharacter(d.chii_characters, subjects[d.chii_crt_cast_index.characterID] || []),
      );
      return {
        total: count,
        data: characters,
      };
    },
  );

  app.get(
    '/persons/:personID/collects',
    {
      schema: {
        summary: '获取人物的收藏用户',
        operationId: 'getPersonCollects',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.PersonCollect)),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({ auth, params: { personID }, query: { limit = 20, offset = 0 } }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonCollects.cat, 'prsn'),
        op.eq(schema.chiiPersonCollects.mid, personID),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiPersonCollects.uid, schema.chiiUsers.id))
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiPersonCollects.uid, schema.chiiUsers.id))
        .where(condition)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const users = data.map((d) =>
        convert.toPersonCollect(d.chii_members, d.chii_person_collects),
      );
      return {
        total: count,
        data: users,
      };
    },
  );

  app.get(
    '/persons/:personID/comments',
    {
      schema: {
        summary: '获取人物的吐槽箱',
        operationId: 'getPersonComments',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        response: {
          200: t.Array(res.Comment),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({ auth, params: { personID } }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      return await comment.getAll(personID);
    },
  );

  app.post(
    '/persons/:personID/comments',
    {
      schema: {
        summary: '创建人物的吐槽',
        operationId: 'createPersonComment',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        body: t.Intersect([req.Ref(req.CreateReply), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new comment id' }),
          }),
        },
      },
      preHandler: [requireLogin('creating a comment'), requireTurnstileToken()],
    },
    async ({ auth, body: { content, replyTo = 0 }, params: { personID } }) => {
      return await comment.create(auth, personID, content, replyTo);
    },
  );

  app.put(
    '/persons/-/comments/:commentID',
    {
      schema: {
        summary: '编辑人物的吐槽',
        operationId: 'updatePersonComment',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        body: req.Ref(req.UpdateContent),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('edit a comment')],
    },
    async ({ auth, body: { content }, params: { commentID } }) => {
      return await comment.update(auth, commentID, content);
    },
  );

  app.delete(
    '/persons/-/comments/:commentID',
    {
      schema: {
        summary: '删除人物的吐槽',
        operationId: 'deletePersonComment',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('delete a comment')],
    },
    async ({ auth, params: { commentID } }) => {
      return await comment.delete(auth, commentID);
    },
  );
}
