/** 敏感词过滤 */
import RE2 from 're2';

import { fileConfig } from './config';

const controlPattern = /[\u200B-\u200F\u202A-\u202E\uFEFF]/;

interface Option {
  nsfw_word?: string;
  disabled_words?: string;
  banned_domain?: string;
}

export class Dam {
  private readonly nsfwWord: RE2 | undefined;
  private readonly disableWord: RE2 | undefined;
  private readonly bannedDomain: RE2 | undefined;

  constructor({ banned_domain, disabled_words, nsfw_word }: Option) {
    if (nsfw_word) {
      this.nsfwWord = new RE2(nsfw_word);
    }

    if (disabled_words) {
      this.disableWord = new RE2(disabled_words);
    }

    if (banned_domain) {
      this.bannedDomain = new RE2(banned_domain);
    }
  }

  needReview(text: string): boolean {
    if (text === '') {
      return false;
    }

    if (!this.disableWord) {
      return false;
    }

    return this.disableWord.test(text.toLowerCase());
  }

  censoredWords(text: string): boolean {
    if (this.disableWord?.test(text)) {
      return true;
    }

    if (this.bannedDomain != undefined) {
      return this.bannedDomain.test(text);
    }

    return false;
  }

  static allCharacterPrintable(s: string): boolean {
    return !controlPattern.test(s);
  }
}

export const dam = new Dam(fileConfig);
