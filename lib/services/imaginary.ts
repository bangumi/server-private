import { createError } from '@fastify/error';
import { FormData } from 'formdata-node'; // or:
import httpCodes from 'http-status-codes';

import config from '@app/lib/config';
import { BaseHttpSrv } from '@app/lib/services/base';

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

export class Imaginary extends BaseHttpSrv {
  constructor() {
    super(config.image.imaginaryUrl);
  }

  async info(img: Buffer): Promise<Info> {
    const form = new FormData();
    form.append('file', new Blob([img]), 'image-file');

    const res = await this.client.post('info', {
      body: form,
      searchParams: { field: 'file' },
      throwHttpErrors: false,
    });

    if (res.statusCode >= 300) {
      throw new NotValidImageError();
    }

    return JSON.parse(res.body) as Info;
  }
}

const d = new Imaginary();

export default d;
