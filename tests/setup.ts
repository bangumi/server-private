import { afterAll, vi } from 'vitest';

vi.mock('@app/lib/externals/turnstile', () => {
  return {
    createTurnstileDriver: () => {
      return { verify: (res: string) => Promise.resolve(res === 'fake-response') };
    },
    Turnstile: class {
      verify(res: string): Promise<boolean> {
        return Promise.resolve(res === 'fake-response');
      }
    },
  };
});

afterAll(() => {
  vi.resetModules();
});
