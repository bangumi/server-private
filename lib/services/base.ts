import type { OptionsInit } from 'got';
import { Options } from 'got';
import * as got from 'got';

import { HTTPS_PROXY } from '@app/lib/config.ts';
import { getProxyAgent } from '@app/lib/utils/proxy.ts';

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
      opt.agent = getProxyAgent(HTTPS_PROXY);
    }

    this.client = got.create({
      options: new Options(baseUrl, opt),
      handlers: [],
      mutableDefaults: false,
    });
  }
}
