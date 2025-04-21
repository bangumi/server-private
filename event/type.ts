export const EventOp = Object.freeze({
  Create: 'c',
  Delete: 'd',
  Update: 'u',
  Snapshot: 'r',
} as const);

export type EventOp = (typeof EventOp)[keyof typeof EventOp];

export interface Payload {
  // before: object;
  // after: object;
  source: {
    table: string;
  };
  op: EventOp;
}

export interface KafkaMessage {
  topic: string;
  key: string;
  value: string;
}
