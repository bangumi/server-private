import { describe, expect, test } from 'vitest';

import { currentOrigin } from './passkey.ts';

const bgmOrigins = ['https://bgm.tv', 'https://bangumi.tv', 'https://chii.in'];

describe('currentOrigin', () => {
  test('returns the allowlisted origin when the host matches', () => {
    expect(currentOrigin('bgm.tv', bgmOrigins, 'http')).toBe('https://bgm.tv');
    expect(currentOrigin('next.bgm.tv', [...bgmOrigins, 'https://next.bgm.tv'], 'http')).toBe(
      'https://next.bgm.tv',
    );
  });

  test('host comparison ignores port and case', () => {
    expect(currentOrigin('NEXT.BGM.TV:8080', [...bgmOrigins, 'https://next.bgm.tv'], 'http')).toBe(
      'https://next.bgm.tv',
    );
  });

  test('skips invalid allowlisted origins', () => {
    expect(currentOrigin('bgm.tv', ['not a url', 'https://bgm.tv'], 'http')).toBe('https://bgm.tv');
  });

  test('falls back to the request protocol without X-Forwarded-Proto', () => {
    // eslint-disable-next-line unicorn/prefer-https -- intentionally asserts the http fallback
    expect(currentOrigin('next.bgm.tv', bgmOrigins, 'http')).toBe('http://next.bgm.tv');
    expect(currentOrigin('next.bgm.tv', bgmOrigins, 'https')).toBe('https://next.bgm.tv');
  });

  test('uses X-Forwarded-Proto when present', () => {
    expect(currentOrigin('next.bgm.tv', bgmOrigins, 'http', 'https')).toBe('https://next.bgm.tv');
  });

  test('X-Forwarded-Proto takes the first value when chained', () => {
    expect(currentOrigin('next.bgm.tv', bgmOrigins, 'http', 'https, http')).toBe(
      'https://next.bgm.tv',
    );
  });
});
