import type { Wiki } from '@bgm38/wiki';
import { parse } from '@bgm38/wiki';
import { expect, test } from 'vitest';

import { extractDate, extractFromString } from '@app/lib/subject/date.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import { DATE } from '@app/lib/utils/date.ts';

test.each([
  ['', undefined],
  ['2020年1月3日', DATE.parse('2020-01-03')],
  ['2017-12-22(2018年1月5日・12日合併号)', DATE.parse('2017-12-22')],
  ['2025年', new DATE(2025)],
])('extractFromString(%s) -> %s', (input, expected) => {
  expect(extractFromString(input)).toEqual(expected);
});

test.each([
  [parse(`{{Infobox}}`), SubjectType.Book, new DATE(0)],
  [
    parse(`{{Infobox
|放送开始=1887-07-01
}}`),
    SubjectType.Anime,
    DATE.parse('1887-07-01'),
  ],
  [
    parse(`{{Infobox animanga/Novel
|发售日= 2024-02-24（预售）
|开始= 2021-04-16
|结束= 2021-06-02
}}`),
    SubjectType.Book,
    DATE.parse('2024-02-24'),
  ],
  [
    parse(`{{Infobox animanga/Novel
|中文名= 弑子村
|别名={
[弒子村]
}
|出版社= 講談社
|价格= ￥1,540
|连载杂志= 
|发售日= 2019-11-28
|册数= 
|页数= 248
|话数= 
|ISBN= 4065170958
|其他= 
|作者= 木原音瀬
|插图= 中村明日美子
}}`),
    SubjectType.Book,
    DATE.parse('2019-11-28'),
  ],
])('extractDate(%s) = %s', (w: Wiki, t: SubjectType, date: DATE) => {
  expect(extractDate(w, t, 0)).toEqual(date);
});
