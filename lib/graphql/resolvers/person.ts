import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';

import type { orm } from '@app/drizzle';
import { personImages } from '@app/lib/images';

function convertCareer(person: orm.IPerson) {
  const result: string[] = [];
  if (person.producer) {
    result.push('producer');
  }
  if (person.mangaka) {
    result.push('mangaka');
  }
  if (person.artist) {
    result.push('artist');
  }
  if (person.seiyu) {
    result.push('seiyu');
  }
  if (person.writer) {
    result.push('writer');
  }
  if (person.illustrator) {
    result.push('illustrator');
  }
  if (person.actor) {
    result.push('actor');
  }
  return result;
}

export function convertPerson(person: orm.IPerson) {
  let wiki: Wiki = {
    type: '',
    data: [],
  };
  try {
    wiki = parseWiki(person.infobox);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox = wiki.data.map((item) => {
    if (item.array) {
      return item;
    }
    return {
      key: item.key,
      values: [
        {
          v: item.value,
        },
      ],
    };
  });
  return {
    id: person.id,
    name: person.name,
    type: person.type,
    infobox,
    career: convertCareer(person),
    summary: person.summary,
    images: personImages(person.img),
    comment: person.comment,
    collects: person.collects,
    last_post: person.lastPost,
    lock: person.lock,
    redirect: person.redirect,
    nsfw: person.nsfw,
  };
}
