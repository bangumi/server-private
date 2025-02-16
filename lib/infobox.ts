import type * as res from '@app/lib/types/res.ts';

export function getInfoboxValue(infobox: res.IInfoboxItem[], keys: string[], limit = 5): string {
  const item = infobox.find((i) => keys.includes(i.key) && i.values.length > 0);
  if (!item) {
    return '';
  }
  const list: string[] = [];
  for (const value of item.values) {
    if (!value.v) {
      continue;
    }
    list.push(value.v);
  }
  let rt = list.slice(0, limit).join('、');
  if (list.length > limit) {
    rt += '等';
  }
  return rt;
}
