import type { OptionsInit } from 'got';
import { Options } from 'got';
import * as got from 'got';

import { HTTPS_PROXY } from '@app/lib/config';
import ProxyAgent from '@app/vendor/proxy-agent';

/** 内网环境的服务的基类，不支持 HTTP PROXY */
export class BaseHttpSrv {
  protected readonly client: got.Got;

  constructor(prefixUrl: string) {
    this.client = got.create({
      options: new Options({
        prefixUrl,
        http2: true,
      }),
      handlers: [],
      mutableDefaults: false,
    });
  }
}

/** 非内网环境的服务的基类，支持 HTTP PROXY */
export class BaseExternalHttpSrv {
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
