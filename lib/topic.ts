import type { ReplyState } from './auth/rule';
import { UnexpectedNotFoundError, UnimplementedError } from './errors';
import type { IUser } from './orm';
import { fetchUser } from './orm';
import prisma from './prisma';

export const enum TopicType {
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
  type: TopicType;
}

export class Topic {
  protected static async getSubjectTopic(id: number): Promise<IPost | null> {
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
      type: TopicType.group,
      user: u,
      createdAt: p.dateline,
      state: p.state,
      topicID: p.mid,
      content: p.content,
    };
  }

  static async getPost(type: TopicType, id: number): Promise<IPost | null> {
    if (type === TopicType.group) {
      return await this.getSubjectTopic(id);
    }

    throw new UnimplementedError(`topic ${type}`);
  }
}
