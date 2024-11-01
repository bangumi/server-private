import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';

import * as convert from './convert.ts';
import type * as res from './res.ts';

export async function fetchSlimUserByUsername(username: string): Promise<res.ISlimUser | null> {
  const data = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.eq(schema.chiiUsers.username, username))
    .execute();
  for (const d of data) {
    return convert.toSlimUser(d);
  }
  return null;
}

export async function fetchSlimSubjectByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimSubject | null> {
  const data = await db
    .select()
    .from(schema.chiiSubjects)
    .where(
      op.and(
        op.eq(schema.chiiSubjects.id, id),
        op.eq(schema.chiiSubjects.ban, 0),
        allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .execute();
  for (const d of data) {
    return convert.toSlimSubject(d);
  }
  return null;
}

export async function fetchSubjectByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISubject | null> {
  const data = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(
      op.and(
        op.eq(schema.chiiSubjects.id, id),
        op.eq(schema.chiiSubjects.ban, 0),
        allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .execute();
  for (const d of data) {
    return convert.toSubject(d.chii_subjects, d.chii_subject_fields);
  }
  return null;
}

export async function fetchSlimCharacterByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimCharacter | null> {
  const data = await db
    .select()
    .from(schema.chiiCharacters)
    .where(
      op.and(
        op.eq(schema.chiiCharacters.id, id),
        op.eq(schema.chiiCharacters.ban, 0),
        allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      ),
    )
    .execute();
  for (const d of data) {
    return convert.toSlimCharacter(d);
  }
  return null;
}

export async function fetchSlimPersonByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimPerson | null> {
  const data = await db
    .select()
    .from(schema.chiiPersons)
    .where(
      op.and(
        op.eq(schema.chiiPersons.id, id),
        op.eq(schema.chiiPersons.ban, 0),
        allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      ),
    )
    .execute();
  for (const d of data) {
    return convert.toSlimPerson(d);
  }
  return null;
}

export async function fetchCastsBySubjectAndCharacterIDs(
  subjectID: number,
  characterIDs: number[],
  allowNsfw: boolean,
): Promise<Map<number, res.ISlimPerson[]>> {
  const data = await db
    .select()
    .from(schema.chiiCharacterCasts)
    .innerJoin(
      schema.chiiPersons,
      op.and(op.eq(schema.chiiCharacterCasts.personID, schema.chiiPersons.id)),
    )
    .where(
      op.and(
        op.eq(schema.chiiCharacterCasts.subjectID, subjectID),
        op.inArray(schema.chiiCharacterCasts.characterID, characterIDs),
        op.eq(schema.chiiPersons.ban, 0),
        allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      ),
    )
    .execute();
  const map = new Map<number, res.ISlimPerson[]>();
  for (const d of data) {
    const person = convert.toSlimPerson(d.chii_persons);
    const list = map.get(d.chii_crt_cast_index.characterID) || [];
    list.push(person);
    map.set(d.chii_crt_cast_index.characterID, list);
  }
  return map;
}

export async function fetchCastsByPersonAndCharacterIDs(
  personID: number,
  characterIDs: number[],
  subjectType: number | undefined,
  type: number | undefined,
  allowNsfw: boolean,
): Promise<Map<number, res.ISlimSubject[]>> {
  const data = await db
    .select()
    .from(schema.chiiCharacterCasts)
    .innerJoin(
      schema.chiiSubjects,
      op.and(op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiSubjects.id)),
    )
    .innerJoin(
      schema.chiiCharacterSubjects,
      op.and(
        op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacterSubjects.characterID),
        op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiCharacterSubjects.subjectID),
      ),
    )
    .where(
      op.and(
        op.eq(schema.chiiCharacterCasts.personID, personID),
        op.inArray(schema.chiiCharacterCasts.characterID, characterIDs),
        subjectType ? op.eq(schema.chiiCharacterCasts.subjectType, subjectType) : undefined,
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.eq(schema.chiiSubjects.ban, 0),
        allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .execute();
  const map = new Map<number, res.ISlimSubject[]>();
  for (const d of data) {
    const subject = convert.toSlimSubject(d.chii_subjects);
    const list = map.get(d.chii_crt_cast_index.characterID) || [];
    list.push(subject);
    map.set(d.chii_crt_cast_index.characterID, list);
  }
  return map;
}
