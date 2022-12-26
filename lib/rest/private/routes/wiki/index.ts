import * as subject from './subject';

import type { App } from 'app/lib/rest/type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(subject.setup);
}
