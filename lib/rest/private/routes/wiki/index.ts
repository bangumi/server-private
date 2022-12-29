import type { App } from '@app/lib/rest/type';

import * as subject from './subject';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(subject.setup);
}
