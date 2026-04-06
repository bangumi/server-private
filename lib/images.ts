import { imageDomain } from '@app/lib/config.ts';

import type * as res from './types/res.ts';

const baseAvatarPath = `pic/user/l`;
const baseIconPath = `pic/icon/l`;
const basePhotoPath = `pic/photo/l`;
const baseSubjectImagePath = `pic/cover/l`;
const basePersonImagePath = `pic/crt/l`;

export function avatar(s: string): res.IAvatar {
  if (!s) {
    s = 'icon.jpg';
  }

  return {
    large: `https://${imageDomain}/${baseAvatarPath}/${s}`,
    medium: `https://${imageDomain}/r/200/${baseAvatarPath}/${s}`,
    small: `https://${imageDomain}/r/100/${baseAvatarPath}/${s}`,
  };
}

export function groupIcon(s: string): res.IAvatar {
  if (!s) {
    s = 'no_icon.jpg';
  }
  return {
    large: `https://${imageDomain}/${baseIconPath}/${s}`,
    medium: `https://${imageDomain}/r/200/${baseIconPath}/${s}`,
    small: `https://${imageDomain}/r/100/${baseIconPath}/${s}`,
  };
}

export function blogIcon(s: string): string {
  if (!s) {
    return `https://${imageDomain}/pic/photo/g/no_photo.png`;
  }
  return `https://${imageDomain}/r/200x200/${basePhotoPath}/${s}`;
}

export function subjectCover(s: string): res.ISubjectImages | undefined {
  if (!s) {
    return;
  }
  return {
    large: `https://${imageDomain}/${baseSubjectImagePath}/${s}`,
    common: `https://${imageDomain}/r/400/${baseSubjectImagePath}/${s}`,
    medium: `https://${imageDomain}/r/200/${baseSubjectImagePath}/${s}`,
    small: `https://${imageDomain}/r/100/${baseSubjectImagePath}/${s}`,
    grid: `https://${imageDomain}/r/100x100/${baseSubjectImagePath}/${s}`,
  };
}

export function personImages(s: string): res.IPersonImages | undefined {
  if (!s) {
    return;
  }
  return {
    large: `https://${imageDomain}/${basePersonImagePath}/${s}`,
    medium: `https://${imageDomain}/r/200/${basePersonImagePath}/${s}`,
    small: `https://${imageDomain}/r/100/${basePersonImagePath}/${s}`,
    grid: `https://${imageDomain}/r/100x100/${basePersonImagePath}/${s}`,
  };
}
