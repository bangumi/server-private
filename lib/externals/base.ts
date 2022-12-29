import type { OptionsInit } from 'got';
import { Options } from 'got';
import * as got from 'got';
import ProxyAgent from 'proxy-agent';

import { HTTPS_PROXY } from '@app/lib/config';

export class WithHttpClient {
  protected readonly client: got.Got;

  constructor(baseUrl: string) {
    const opt: OptionsInit = {
      http2: true,
    };

    // local developing env with proxy
    if (HTTPS_PROXY) {
      opt.http2 = false;

      const agent = new ProxyAgent(HTTPS_PROXY);
      opt.agent = { http: agent, https: agent };
    }

    this.client = got.create({
      options: new Options(baseUrl, opt),
      handlers: [],
      mutableDefaults: false,
    });
  }
}
