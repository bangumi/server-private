// eslint-disable-next-line erasable-syntax-only/enums
export enum GroupFilterMode {
  All = 'all',
  Joined = 'joined',
  Managed = 'managed',
}

// eslint-disable-next-line erasable-syntax-only/enums
export enum GroupTopicFilterMode {
  All = 'all',
  Joined = 'joined',
  Created = 'created',
  Replied = 'replied',
}

// eslint-disable-next-line erasable-syntax-only/enums
export enum GroupSort {
  Members = 'members',
  Posts = 'posts',
  Topics = 'topics',
  Created = 'created',
  Updated = 'updated',
}

// eslint-disable-next-line erasable-syntax-only/enums
export enum GroupMemberRole {
  Visitor = -2,
  Guest = -1,
  Member = 0,
  Creator = 1,
  Moderator = 2,
  Blocked = 3,
}
