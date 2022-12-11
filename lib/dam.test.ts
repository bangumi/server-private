import { expect, test } from 'vitest';

import { Dam } from './dam';

test('should check printable characters', () => {
  expect(Dam.allCharacterPrintable('\u202C')).toBe(false);
  expect(Dam.allCharacterPrintable('\u202D')).toBe(false);
  expect(Dam.allCharacterPrintable("See what's hidden in your string…\tor be​hind﻿")).toBe(false);

  // emoji dog face
  expect(Dam.allCharacterPrintable('\u{0001F436}')).toBe(true);
});

test('should test censored words', () => {
  const d = new Dam({
    nsfw_word: '',
    disabled_words: '假身份证|代办',
    banned_domain: 'lista.cc|snapmail.cc|ashotmail.com',
  });

  expect(d.needReview('1 x 代办 xx1 ')).toBe(true);
  expect(d.censoredWords('https://lista.cc/')).toBe(true);
});
