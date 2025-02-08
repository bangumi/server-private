import { expect, test } from 'vitest';

import { fetchPermission } from './perm.ts';

test('should fetch permission', async () => {
  await expect(fetchPermission(0)).resolves.toMatchInlineSnapshot(`
    Object {
      "ban_post": true,
      "ban_visit": true,
    }
  `);
});

test('should not fallback to empty permission', async () => {
  await expect(fetchPermission(10)).resolves.toMatchInlineSnapshot(`
    Object {
      "app_erase": true,
      "doujin_subject_lock": true,
      "ep_edit": true,
      "ep_move": true,
      "manage_user": true,
      "manage_user_group": true,
      "mono_erase": true,
      "mono_merge": true,
      "report": true,
      "subject_edit": true,
      "subject_lock": true,
      "subject_refresh": true,
      "subject_related": true,
      "user_list": true,
    }
  `);
});
