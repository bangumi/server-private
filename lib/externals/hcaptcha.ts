import type { Dispatcher } from 'undici';
import { request, Client, ProxyAgent } from 'undici';

import { HTTPS_PROXY } from '../config';

const VerifyURL = 'https://hcaptcha.com/siteverify';

export class HCaptcha {
  private readonly secretKey: string;
  private readonly client: Dispatcher;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
    if (HTTPS_PROXY) {
      this.client = new ProxyAgent(HTTPS_PROXY);
    } else {
      this.client = new Client('https://hcaptcha.com', { pipelining: 2 });
    }
  }

  async verify(response: string): Promise<boolean> {
    const { body } = await request(VerifyURL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${this.secretKey}&response=${encodeURIComponent(response)}`,
      dispatcher: this.client,
    });

    const data = (await body.json()) as { success: boolean };

    return data.success;
  }
}
