import { SubjectType } from './type';

function getDisplayFields(type: SubjectType): string[][] {
  const airdate = ['放送开始', '上映日', '上映年度', '发售日'];
  switch (type) {
    case SubjectType.Book: {
      return [airdate, ['作者'], ['译者'], ['作画', '插图', '插圖'], ['出版社'], ['页数']];
    }
    case SubjectType.Anime: {
      return [airdate, ['导演'], ['原作'], ['人物设定']];
    }
    case SubjectType.Music: {
      return [['发售日期'], ['艺术家'], ['制作人'], ['售价']];
    }
    case SubjectType.Game: {
      return [['发行日期'], ['平台'], ['游戏类型'], ['开发', '游戏开发商']];
    }
    case SubjectType.Real: {
      return [airdate, ['开始'], ['导演'], ['编剧'], ['主演']];
    }
  }
}

interface InfoboxValue {
  k?: string;
  v: string;
}

interface InfoboxItem {
  key: string;
  values: InfoboxValue[];
}

function getInfoboxValue(infobox: InfoboxItem[], keys: string[], limit = 5): string {
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

export function getInfoboxSummary(infobox: InfoboxItem[], type: SubjectType, eps = 0): string {
  const displayFields = getDisplayFields(type);
  const list: string[] = [];
  if (eps > 0) {
    list.push(`${eps}话`);
  }
  for (const keys of displayFields) {
    const value = getInfoboxValue(infobox, keys);
    if (value) {
      list.push(value);
    }
  }
  return list.join(' / ');
}
