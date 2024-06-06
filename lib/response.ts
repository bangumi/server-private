import { imageDomain } from '@app/lib/config.ts';

import type * as res from './types/res.ts';

const baseAvatarUrl = `https://${imageDomain}/pic/user`;
const baseSubjectImageUrl = `https://${imageDomain}/pic/cover`;

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

export function groupIcon(s: string): string {
  return `https://${imageDomain}/pic/icon/s/${s}`;
}

export function subjectCover(s: string): res.ISubjectImages | null {
  if (!s) {
    return null;
  }
  return {
    large: `${baseSubjectImageUrl}/l/${s}`,
    common: `${baseSubjectImageUrl}/c/${s}`,
    medium: `${baseSubjectImageUrl}/m/${s}`,
    small: `${baseSubjectImageUrl}/s/${s}`,
    grid: `${baseSubjectImageUrl}/g/${s}`,
  };
}
