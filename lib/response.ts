const baseAvatarUrl = 'https://lain.bgm.tv/pic/user';

export function avatar(s: string): { small: string; medium: string; large: string } {
  if (!s) {
    s = 'icon.jpg';
  }

  return {
    large: `${baseAvatarUrl}/l/${s}`,
    medium: `${baseAvatarUrl}/m/${s}`,
    small: `${baseAvatarUrl}/s/${s}`,
  };
}
