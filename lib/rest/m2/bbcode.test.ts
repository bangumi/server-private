import { expect, test } from 'vitest';

import { ChiiCodeCore } from './bbcode';

test('mask', () => {
  const c = new ChiiCodeCore();
  expect(c.chiicode('[mask]a[/mask]')).toMatchInlineSnapshot(
    '"<span style=\\"background-color:#555;color:#555;border:1px solid #555;\\">a</span>"',
  );
});

test('url', () => {
  const c = new ChiiCodeCore();
  expect(c.chiicode('[url]https://github.com[/url]')).toMatchInlineSnapshot(
    '"[url]https://github.com[/url]"',
  );
});
