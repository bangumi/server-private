import { db, op, type orm, schema } from '@app/drizzle';
import { NotFoundError } from '@app/lib/error.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

export const MonoPhotoType = Object.freeze({
  Character: 1,
  Person: 2,
});

export type MonoPhotoType = (typeof MonoPhotoType)[keyof typeof MonoPhotoType];

export const MonoPhotoOrderBy = Object.freeze({
  ID: 'id',
  Dateline: 'dateline',
  Lasttouch: 'lasttouch',
});

export type MonoPhotoOrderBy = (typeof MonoPhotoOrderBy)[keyof typeof MonoPhotoOrderBy];

function orderColumn(orderBy: MonoPhotoOrderBy) {
  switch (orderBy) {
    case 'dateline': {
      return schema.chiiSubjectPhotos.createdAt;
    }
    case 'lasttouch': {
      return schema.chiiSubjectPhotos.updatedAt;
    }
    case 'id': {
      return schema.chiiSubjectPhotos.id;
    }
  }
}

function condition(type: MonoPhotoType, mainID: number) {
  return op.and(
    op.eq(schema.chiiSubjectPhotos.type, type),
    op.eq(schema.chiiSubjectPhotos.mid, mainID),
    op.eq(schema.chiiSubjectPhotos.ban, false),
  );
}

async function attachUsers(photos: orm.ISubjectPhoto[]): Promise<res.IMonoPhoto[]> {
  const users = await fetcher.fetchSlimUsersByIDs(photos.map((photo) => photo.uid));
  return photos.map((photo) => ({
    ...convert.toMonoPhoto(photo),
    user: users[photo.uid],
  }));
}

export async function fetchMonoPhotoList({
  type,
  mainID,
  limit,
  offset,
  orderBy,
}: {
  type: MonoPhotoType;
  mainID: number;
  limit: number;
  offset: number;
  orderBy: MonoPhotoOrderBy;
}): Promise<{ total: number; data: res.IMonoPhoto[] }> {
  const where = condition(type, mainID);
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiSubjectPhotos)
    .where(where);
  const photos = await db
    .select()
    .from(schema.chiiSubjectPhotos)
    .where(where)
    .orderBy(op.desc(orderColumn(orderBy)))
    .limit(limit)
    .offset(offset);
  return {
    total: count,
    data: await attachUsers(photos),
  };
}

export async function fetchMonoPhoto(
  type: MonoPhotoType,
  mainID: number,
  photoID: number,
): Promise<res.IMonoPhoto | undefined> {
  const [photo] = await db
    .select()
    .from(schema.chiiSubjectPhotos)
    .where(
      op.and(
        op.eq(schema.chiiSubjectPhotos.id, photoID),
        op.eq(schema.chiiSubjectPhotos.type, type),
        op.eq(schema.chiiSubjectPhotos.mid, mainID),
        op.eq(schema.chiiSubjectPhotos.ban, false),
      ),
    )
    .limit(1);
  if (!photo) {
    return;
  }
  const [data] = await attachUsers([photo]);
  return data;
}

export async function requireMonoPhoto(type: MonoPhotoType, mainID: number, photoID: number) {
  const photo = await fetchMonoPhoto(type, mainID, photoID);
  if (!photo) {
    throw new NotFoundError(`photo ${photoID}`);
  }
  return photo;
}
