import * as console from 'node:console';

import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';

import config, { testing } from '@app/lib/config.ts';
import { UnimplementedError } from '@app/lib/error.ts';
import { BaseHttpSrv } from '@app/lib/services/base.ts';

export const NotValidImageError = createError(
  'ERR_NOT_IMAGE',
  'invalid image file',
  httpCodes.BAD_REQUEST,
);

export interface Info {
  width: number;
  height: number;
  type: string;
  // space: 'srgb',
  // hasAlpha: false,
  // hasProfile: true,
  // channels: 3,
  // orientation: 1,
}

export interface IImaginary {
  info(img: Buffer): Promise<Info>;

  convert(img: Buffer, target: { format: 'jpeg' }): Promise<Buffer>;
}

class Imaginary extends BaseHttpSrv implements IImaginary {
  async info(img: Buffer): Promise<Info> {
    const res = await this.client.post('info', {
      body: img,
      throwHttpErrors: false,
    });

    if (res.statusCode >= 300) {
      throw new NotValidImageError();
    }

    return JSON.parse(res.body) as Info;
  }

  async convert(img: Buffer, { format }: { format: 'jpeg' }): Promise<Buffer> {
    const res = await this.client.post('convert', {
      body: img,
      searchParams: { type: format, quality: 80 },
      throwHttpErrors: false,
    });

    if (res.statusCode >= 300) {
      throw new Error('failed to convert image: ' + res.body);
    }

    return res.rawBody;
  }
}

let d: IImaginary;

if (config.image.imaginaryUrl) {
  // validate base url
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  new URL(config.image.imaginaryUrl);
  d = new Imaginary(config.image.imaginaryUrl);
} else {
  if (!testing) {
    console.warn('!!! 缺少 `image.imaginaryUrl` 设置，不会验证上传图片的有效性');
    console.warn('!!! 缺少 `image.imaginaryUrl` 设置，不会验证上传图片的有效性');
  }
  d = {
    info(): Promise<Info> {
      return Promise.resolve({ width: 0, height: 0, type: 'jpg' });
    },
    convert(): Promise<Buffer> {
      throw new UnimplementedError('missing imaginary');
    },
  };
}

export default d;
