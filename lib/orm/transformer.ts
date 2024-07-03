import * as lo from 'lodash-es';

export interface Transformer<DBType, ValueType> {
  to(value: ValueType): DBType;

  from(value: DBType): ValueType;
}

export const htmlEscapedString: Transformer<string, string> = {
  to: (value: string) => lo.escape(value),
  from: (value: string) => lo.unescape(value),
};

export const UnixTimestamp: Transformer<number, Date> = {
  to: (value: Date) => Math.trunc(value.getTime() / 1000),
  from: (value: number) => new Date(value * 1000),
};

export const BooleanTransformer: Transformer<number, boolean> = {
  to: (value: boolean) => (value ? 1 : 0),
  from: (value: number) => value === 1,
};
