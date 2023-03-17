import { imageDomain } from '@app/lib/config';

import type * as res from './types/res';

const baseAvatarUrl = `https://${imageDomain}/pic/user`;

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
