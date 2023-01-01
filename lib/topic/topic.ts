import type { IAuth } from '@app/lib/auth';
import { UnexpectedNotFoundError } from '@app/lib/error';
import type { IBaseReply } from '@app/lib/orm';
import { GroupPostRepo, GroupTopicRepo, SubjectFieldsRepo, SubjectRepo } from '@app/lib/orm';
import { filterReply } from '@app/lib/topic/display';

export type ISubReply = IBaseReply;

export interface IReply extends IBaseReply {
  replies: ISubReply[];
}

export interface ITopicDetails {
  id: number;
  title: string;
  text: string;
  display: number;
  state: number;
  createdAt: number;
  creatorID: number;
  // group ID or subject ID
  parentID: number;
  replies: IReply[];
}

export async function fetchTopicDetails(
  auth: IAuth,
  type: 'group',
  id: number,
): Promise<ITopicDetails | null> {
  const topic = await GroupTopicRepo.findOne({
    where: { id: id },
  });

  if (!topic) {
    return null;
  }

  const replies = await GroupPostRepo.find({
    where: {
      topicID: topic.id,
    },
  });

  const top = replies.shift();
  if (!top) {
    throw new UnexpectedNotFoundError(`top reply of topic(${type}) ${id}`);
  }

  const subReplies: Record<number, ISubReply[]> = {};

  for (const x of replies.filter((x) => x.related !== 0)) {
    const sub: ISubReply = {
      id: x.id,
      repliedTo: x.related,
      creatorID: x.uid,
      text: x.content,
      state: x.state,
      createdAt: x.dateline,
    };

    subReplies[x.related] ??= [];
    subReplies[x.related]?.push(sub);
  }

  const topLevelReplies = replies
    .filter((x) => x.related === 0)
    .map(function (x): IReply {
      return {
        id: x.id,
        replies: subReplies[x.id] ?? ([] as ISubReply[]),
        creatorID: x.uid,
        text: x.content,
        state: x.state,
        createdAt: x.dateline,
        repliedTo: x.related,
      };
    })
    .map((x) => filterReply(x));

  return {
    id: topic.id,
    title: topic.title,
    parentID: topic.gid,
    text: top.content,
    display: topic.display,
    state: topic.state,
    replies: topLevelReplies,
    creatorID: top.uid,
    createdAt: top.dateline,
  } satisfies ITopicDetails;
}

export interface ITopic {
  id: number;
  parentID: number;
  creatorID: number;
  updatedAt: number;
  createdAt: number;
  title: string;
  repliesCount: number;
}

export async function fetchSubject(id: number) {
  const subject = await SubjectRepo.findOne({
    where: { id },
  });

  if (!subject) {
    return null;
  }

  const f = await SubjectFieldsRepo.findOne({
    where: { subject_id: id },
  });

  if (!f) {
    throw new UnexpectedNotFoundError(`subject fields ${id}`);
  }

  return {
    id: subject.id,
    name: subject.name,
    typeID: subject.typeID,
    infobox: subject.fieldInfobox,
    platform: subject.platform,
    summary: subject.fieldSummary,
    nsfw: subject.subjectNsfw,
    date: f.date,
    redirect: f.fieldRedirect,
    locked: subject.locked(),
  };
}
