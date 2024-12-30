import { imageDomain } from '@app/lib/config.ts';

import type * as res from './types/res.ts';

const baseAvatarUrl = `https://${imageDomain}/pic/user`;
const baseSubjectImageUrl = `https://${imageDomain}/pic/cover`;
const basePersonImageUrl = `https://${imageDomain}/pic/crt`;

export function avatar(s: string): res.IAvatar {
  if (!s) {
    s = 'icon.jpg';
  }

  return {
    large: `${baseAvatarUrl}/l/${s}`,
    medium: `${baseAvatarUrl}/m/${s}`,
    small: `${baseAvatarUrl}/s/${s}`,
  };
}

export function groupIcon(s: string): res.IAvatar {
  if (!s) {
    s = 'icon.jpg';
  }
  return {
    large: `https://${imageDomain}/pic/icon/l/${s}`,
    medium: `https://${imageDomain}/pic/icon/m/${s}`,
    small: `https://${imageDomain}/pic/icon/s/${s}`,
  };
}

export function subjectCover(s: string): res.ISubjectImages | undefined {
  if (!s) {
    return undefined;
  }
  return {
    large: `${baseSubjectImageUrl}/l/${s}`,
    common: `${baseSubjectImageUrl}/c/${s}`,
    medium: `${baseSubjectImageUrl}/m/${s}`,
    small: `${baseSubjectImageUrl}/s/${s}`,
    grid: `${baseSubjectImageUrl}/g/${s}`,
  };
}

export function personImages(s: string): res.IPersonImages | undefined {
  if (!s) {
    return undefined;
  }
  return {
    large: `${basePersonImageUrl}/l/${s}`,
    medium: `${basePersonImageUrl}/m/${s}`,
    small: `${basePersonImageUrl}/s/${s}`,
    grid: `${basePersonImageUrl}/g/${s}`,
  };
}

export function blogIcon(s: string): string {
  if (!s) {
    return '';
  }
  return `https://${imageDomain}/pic/photo/g/${s}`;
}
