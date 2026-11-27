import * as lo from 'lodash-es';
import t, { type Static } from 'typebox';

export type IScope = Static<typeof Scope>;
export const Scope = t.Object({
  'read:collection': t.Optional(t.Boolean({ default: false })),
  'write:collection': t.Optional(t.Boolean({ default: false })),

  'read:indices': t.Optional(t.Boolean({ default: false })),
  'write:indices': t.Optional(t.Boolean({ default: false })),

  // above is default scope permission, to not break existing API

  'read:topic': t.Optional(t.Boolean({ default: false })),
  'write:topic': t.Optional(t.Boolean({ default: false })),

  'read:wiki': t.Optional(t.Boolean({ default: false })),
  'write:wiki': t.Optional(t.Boolean({ default: false })),
});

export const ScopeDescription: Record<keyof IScope, string> = {
  'read:collection': '获取用户收藏',
  'write:collection': '修改用户收藏',
  'read:indices': '读取目录',
  'write:indices': '修改目录',
  'read:topic': '',
  'write:topic': '发帖/回帖',
  'read:wiki': '获取维基数据',
  'write:wiki': '进行维基编辑',
};

export const EpochDefaultScope: () => IScope = () => ({
  'read:collection': true,
  'write:collection': true,
  'read:indices': true,
  'write:indices': true,
});

export function scopeMessage(s: string[]) {
  const messages = [];

  const perm: Record<string, { write?: boolean; read?: boolean }> = {};

  for (const scope of s) {
    const [rw, name] = scope.split(':', 2) as [string, string];
    lo.set(perm, [name, rw], true);
  }

  for (const [scope, info] of Object.entries(perm)) {
    if (info.write) {
      messages.push(['write', ScopeDescription[('write:' + scope) as keyof IScope]]);
    } else {
      messages.push(['read', ScopeDescription[('read:' + scope) as keyof IScope]]);
    }
  }

  return messages;
}
