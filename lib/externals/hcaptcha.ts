import type { OptionsInit } from 'got';
import { Options } from 'got';
import * as got from 'got';
import ProxyAgent from 'proxy-agent';

import { HTTPS_PROXY } from '../config';

const VerifyURL = 'https://hcaptcha.com/siteverify';

export class HCaptcha {
  private readonly secretKey: string;
  private readonly client: got.Got;

  constructor(secretKey: string) {
    this.secretKey = secretKey;

    const opt: OptionsInit = {};
    if (HTTPS_PROXY) {
      const agent = new ProxyAgent(HTTPS_PROXY);
      opt.agent = { http: agent, https: agent };
    }

    this.client = got.create({
      options: new Options(VerifyURL, opt),
      handlers: [],
      mutableDefaults: false,
    });
  }

  async verify(response: string): Promise<boolean> {
    const data = await this.client
      .post(VerifyURL, {
        form: {
          secret: this.secretKey,
          response,
        },
      })
      .json<{ success: boolean }>();

    return data.success;
  }
}
