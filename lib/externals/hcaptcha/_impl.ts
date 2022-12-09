import type { Dispatcher } from 'undici';
import { request, Client, ProxyAgent } from 'undici';

const VerifyURL = 'https://hcaptcha.com/siteverify';

interface Config {
  secretKey?: string;
}

export class HCaptcha {
  private readonly secretKey: string;
  private readonly client: Dispatcher;

  constructor({ secretKey = '0x0000000000000000000000000000000000000000' }: Config = {}) {
    this.secretKey = secretKey;
    if (process.env.HTTPS_PROXY) {
      this.client = new ProxyAgent(process.env.HTTPS_PROXY);
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
