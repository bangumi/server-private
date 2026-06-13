import { describe, expect, test } from 'vitest';

import {
  canViewNsfwSubject,
  formatUserPrivacy,
  patchPrivacyRaw,
  PrivacyValue,
  serializePrivacyRaw,
} from './privacy.ts';

describe('privacy settings', () => {
  test('should use main site defaults', () => {
    expect(formatUserPrivacy('').settings).toEqual({
      privateMessage: 'all',
      timelineReply: 'all',
      timelineCollectReply: 'friends',
      follow: 'all',
      mentionNotification: 'all',
      commentNotification: 'all',
      friendNotification: 'all',
    });
  });

  test('should decode known settings and preferences', () => {
    expect(
      formatUserPrivacy('{"1":1,"21":2,"32":0,"40":2,"show_nsfw_subject":1}', {
        userID: 100,
        regTime: 1_000,
        now: 1_000 + 60 * 60 * 24 * 61,
      }),
    ).toEqual({
      settings: {
        privateMessage: 'friends',
        timelineReply: 'all',
        timelineCollectReply: 'all',
        follow: 'none',
        mentionNotification: 'all',
        commentNotification: 'none',
        friendNotification: 'all',
      },
      preferences: {
        showNsfwSubject: true,
        canSetNsfwSubject: true,
        allowNsfw: true,
      },
    });
  });

  test('should ignore invalid known values', () => {
    expect(formatUserPrivacy('{"1":"","40":1,"show_nsfw_subject":""}')).toMatchObject({
      settings: {
        privateMessage: 'all',
        follow: 'all',
      },
      preferences: {
        showNsfwSubject: false,
      },
    });
  });

  test('should patch requested fields and preserve unknown keys', () => {
    const next = patchPrivacyRaw('{"32":1,"future_key":42,"show_nsfw_subject":1}', {
      settings: {
        privateMessage: PrivacyValue.Friends,
        follow: PrivacyValue.None,
      },
      preferences: {
        showNsfwSubject: false,
      },
    });

    expect(next).toEqual({
      1: 1,
      32: 1,
      40: 2,
      future_key: 42,
      show_nsfw_subject: 0,
    });
    expect(serializePrivacyRaw(next)).toBe(
      '{"1":1,"32":1,"40":2,"future_key":42,"show_nsfw_subject":0}',
    );
  });

  test('should reject setting values not allowed by main site type config', () => {
    expect(() =>
      patchPrivacyRaw('', {
        settings: {
          follow: PrivacyValue.Friends as never,
        },
      }),
    ).toThrow('follow does not allow friends');
  });
});

describe('nsfw preference gate', () => {
  test('should require preference, age, and active permission', () => {
    const eligibleAt = 1_000 + 60 * 60 * 24 * 60;

    expect(
      canViewNsfwSubject({
        showNsfwSubject: true,
        userID: 100,
        regTime: 1_000,
        now: eligibleAt,
      }),
    ).toBe(true);
    expect(
      canViewNsfwSubject({
        showNsfwSubject: false,
        userID: 100,
        regTime: 1_000,
        now: eligibleAt,
      }),
    ).toBe(false);
    expect(
      canViewNsfwSubject({
        showNsfwSubject: true,
        userID: 100,
        regTime: 1_000,
        now: eligibleAt - 1,
      }),
    ).toBe(false);
    expect(
      canViewNsfwSubject({
        showNsfwSubject: true,
        userID: 100,
        regTime: 1_000,
        permission: { ban_visit: true },
        now: eligibleAt,
      }),
    ).toBe(false);
  });

  test('should treat restricted user id as not eligible', () => {
    const eligibleAt = 1_000 + 60 * 60 * 24 * 60;

    expect(
      formatUserPrivacy('{"show_nsfw_subject":1}', {
        userID: 873244,
        regTime: 1_000,
        now: eligibleAt,
      }).preferences,
    ).toEqual({
      showNsfwSubject: true,
      canSetNsfwSubject: false,
      allowNsfw: false,
    });
  });
});
