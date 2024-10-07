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

export function groupIcon(s: string): string {
  return `https://${imageDomain}/pic/icon/s/${s}`;
}

export function subjectCover(s: string): res.ISubjectImages {
  if (!s) {
    return {
      large: '',
      common: '',
      medium: '',
      small: '',
      grid: '',
    };
  }
  return {
    large: `${baseSubjectImageUrl}/l/${s}`,
    common: `${baseSubjectImageUrl}/c/${s}`,
    medium: `${baseSubjectImageUrl}/m/${s}`,
    small: `${baseSubjectImageUrl}/s/${s}`,
    grid: `${baseSubjectImageUrl}/g/${s}`,
  };
}

export function personImages(s: string): res.IPersonImages {
  if (!s) {
    return {
      large: '',
      medium: '',
      small: '',
      grid: '',
    };
  }
  return {
    large: `${basePersonImageUrl}/l/${s}`,
    medium: `${basePersonImageUrl}/m/${s}`,
    small: `${basePersonImageUrl}/s/${s}`,
    grid: `${basePersonImageUrl}/g/${s}`,
  };
}
