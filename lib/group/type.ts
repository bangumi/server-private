export const GroupFilterMode = Object.freeze({
  All: 'all',
  Joined: 'joined',
  Managed: 'managed',
});

export const GroupTopicFilterMode = Object.freeze({
  All: 'all',
  Joined: 'joined',
  Created: 'created',
  Replied: 'replied',
});

export const GroupSort = Object.freeze({
  Members: 'members',
  Posts: 'posts',
  Topics: 'topics',
  Created: 'created',
  Updated: 'updated',
});

export const GroupMemberRole = Object.freeze({
  Visitor: -2 as number,
  Guest: -1 as number,
  Member: 0 as number,
  Creator: 1 as number,
  Moderator: 2 as number,
  Blocked: 3 as number,
});
