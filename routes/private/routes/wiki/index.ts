import * as ep from '@app/routes/private/routes/wiki/subject/ep.ts';
import type { App } from '@app/routes/type.ts';

import * as subject from './subject';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(subject.setup);
  await app.register(ep.setup);
}
