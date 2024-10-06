export enum CollectionType {
  Wish = 1,
  Collect = 2,
  Doing = 3,
  OnHold = 4,
  Dropped = 5,
}

export const CollectionTypeValues = new Set([1, 2, 3, 4, 5]);

export const CollectionTypeLabels = new Map<CollectionType, string>([
  [CollectionType.Wish, 'wish'],
  [CollectionType.Collect, 'collect'],
  [CollectionType.Doing, 'doing'],
  [CollectionType.OnHold, 'onHold'],
  [CollectionType.Dropped, 'dropped'],
]);
