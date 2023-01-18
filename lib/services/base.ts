import { Options } from 'got';
import * as got from 'got';

/** Http service basic client */
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
