import type { App } from '@app/routes/type.ts';

import * as ep from './subject/ep.ts';
import * as subject from './subject/index.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(subject.setup);
  await app.register(ep.setup);
}
