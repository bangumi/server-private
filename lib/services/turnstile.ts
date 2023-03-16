import { stage } from '@app/lib/config.ts';

import { BaseExternalHttpSrv } from './base';

const VerifyURL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Return a fake or testing cloudflare turnstile captcha driver
 *
 * @see https://developers.cloudflare.com/turnstile/frequently-asked-questions/#are-there-sitekeys-and-secret-keys-that-can-be-used-for-testing
 */
export function createTurnstileDriver(secretKey: string) {
  if (stage) {
    return {
      verify(): Promise<boolean> {
        return Promise.resolve(true);
      },
    };
  }

  return new Turnstile(secretKey);
}

export class Turnstile extends BaseExternalHttpSrv {
  private readonly secretKey: string;

  constructor(secretKey: string) {
    super(VerifyURL);

    this.secretKey = secretKey;
  }

  async verify(response: string): Promise<boolean> {
    const data = await this.client
      .post(VerifyURL, {
        form: {
          secret: this.secretKey,
          response,
        },
        timeout: {
          request: 3000,
        },
      })
      .json<{ success: boolean }>();

    return data.success;
  }
}
