export enum GroupFilterMode {
  All = 'all',
  Joined = 'joined',
  Managed = 'managed',
}

export enum GroupTopicFilterMode {
  All = 'all',
  Joined = 'joined',
  Created = 'created',
  Replied = 'replied',
}

export enum GroupSort {
  Members = 'members',
  Posts = 'posts',
  Topics = 'topics',
  Created = 'created',
  Updated = 'updated',
}

export enum GroupMemberRole {
  Visitor = -2,
  Guest = -1,
  Member = 0,
  Creator = 1,
  Moderator = 2,
  Blocked = 3,
}
