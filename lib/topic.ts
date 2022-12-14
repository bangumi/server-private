import type { ReplyState } from './auth/rule';
import { UnexpectedNotFoundError, UnimplementedError } from './errors';
import type { IUser } from './orm';
import { fetchUser } from './orm';
import prisma from './prisma';

export const enum Type {
  group = 'group',
  subject = 'subject',
}

interface IPost {
  id: number;
  user: IUser;
  createdAt: number;
  state: ReplyState;
  content: string;
  topicID: number;
  type: Type;
}

async function getSubjectTopic(id: number): Promise<IPost | null> {
  const p = await prisma.groupPosts.findFirst({
    where: {
      id,
    },
  });

  if (!p) {
    return null;
  }

  const u = await fetchUser(p.uid);
  if (!u) {
    throw new UnexpectedNotFoundError(`user ${p.uid}`);
  }

  return {
    id: p.id,
    type: Type.group,
    user: u,
    createdAt: p.dateline,
    state: p.state,
    topicID: p.mid,
    content: p.content,
  };
}

export async function getPost(type: Type, id: number): Promise<IPost | null> {
  if (type === Type.group) {
    return await getSubjectTopic(id);
  }

  throw new UnimplementedError(`topic ${type}`);
}
