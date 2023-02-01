import { test } from 'vitest';

import { ChiiCodeCore } from './bbcode';

test('t', () => {
  const c = new ChiiCodeCore();
  c.chiicode("[mask]a[/mask]");
});
