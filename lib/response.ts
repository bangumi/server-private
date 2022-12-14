import type * as res from './types/res';

const baseAvatarUrl = 'https://lain.bgm.tv/pic/user';

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
  return 'https://lain.bgm.tv/pic/icon/s/' + s;
}
