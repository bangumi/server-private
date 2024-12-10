export enum EventOp {
  Create = 'c',
  Delete = 'd',
  Update = 'u',
  Snapshot = 'r',
}

export interface Payload {
  // before: object;
  // after: object;
  source: {
    table: string;
  };
  op: EventOp;
}
