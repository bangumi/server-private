interface FriendAwareUser {
  id: number;
  isFriend: boolean;
}

const emptyFriendIDs: ReadonlySet<number> = new Set();

export function applyUserFriendship<T extends FriendAwareUser>(
  user: T,
  friendIDs: ReadonlySet<number> = emptyFriendIDs,
): T {
  user.isFriend = friendIDs.has(user.id);
  return user;
}

export function applyUsersFriendship<T extends FriendAwareUser>(
  users: Iterable<T>,
  friendIDs: ReadonlySet<number> = emptyFriendIDs,
): void {
  for (const user of users) {
    applyUserFriendship(user, friendIDs);
  }
}
