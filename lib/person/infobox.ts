import { getInfoboxValue } from '@app/lib/infobox.ts';
import type * as res from '@app/lib/types/res.ts';

const DISPLAY_FIELDS = ['性别', '生日', '血型', '身高', '体重', 'BWH'];

export function getInfoboxSummary(infobox: res.IInfoboxItem[]): string {
  const list: string[] = [];
  for (const field of DISPLAY_FIELDS) {
    const value = getInfoboxValue(infobox, [field]);
    if (value) {
      list.push(`${field} ${value}`);
    }
  }
  return list.join(' / ');
}
