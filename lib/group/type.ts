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
  Visitor: -2,
  Guest: -1,
  Member: 0,
  Creator: 1,
  Moderator: 2,
  Blocked: 3,
});
