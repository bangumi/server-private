import * as lo from 'lodash-es';

export const htmlEscapedString = {
  to: (value: string) => lo.escape(value),
  from: (value: string) => lo.unescape(value),
} as const;
