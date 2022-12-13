import { stage } from '../config';
import { WithHttpClient } from './base';

const VerifyURL = 'https://hcaptcha.com/siteverify';

export function createHCaptchaDriver(secretKey: string) {
  if (stage) {
    return {
      verify(): Promise<boolean> {
        return Promise.resolve(true);
      },
    };
  }

  return new HCaptcha(secretKey);
}

export class HCaptcha extends WithHttpClient {
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
          request: 30000,
        },
      })
      .json<{ success: boolean }>();

    return data.success;
  }
}
