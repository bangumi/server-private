/** 敏感词过滤 */
import { fileConfig } from './config';

const controlPattern = /[\u200B-\u200F\u202A-\u202E\uFEFF]/;

interface Option {
  nsfw_word?: string;
  disabled_words?: string;
  banned_domain?: string;
}

export class Dam {
  private readonly nsfwWord: RegExp | undefined;
  private readonly disableWord: RegExp | undefined;
  private readonly bannedDomain: RegExp | undefined;

  constructor({ banned_domain, disabled_words, nsfw_word }: Option) {
    if (nsfw_word) {
      this.nsfwWord = new RegExp(nsfw_word);
    }

    if (disabled_words) {
      this.disableWord = new RegExp(disabled_words);
    }

    if (banned_domain) {
      this.bannedDomain = new RegExp(banned_domain);
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
