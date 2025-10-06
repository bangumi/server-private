import t, { type Static } from 'typebox';
import * as lo from 'lodash-es';

export type IScope = Static<typeof Scope>;
export const Scope = t.Object({
  'read:collection': t.Optional(t.Boolean({ default: false, description: '获取用户收藏' })),
  'write:collection': t.Optional(t.Boolean({ default: false, description: '修改用户收藏' })),

  'read:indices': t.Optional(t.Boolean({ default: false, description: '读取目录' })),
  'write:indices': t.Optional(t.Boolean({ default: false, description: '修改目录' })),

  // above is default scope permission, to not break existing API

  'read:topic': t.Optional(t.Boolean({ default: false })),
  'write:topic': t.Optional(t.Boolean({ default: false, description: '发帖/回帖' })),

  'read:wiki': t.Optional(t.Boolean({ default: false, description: '获取维基数据' })),
  'write:wiki': t.Optional(t.Boolean({ default: false, description: '进行维基编辑' })),
});

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
      messages.push(['write', Scope.properties[('write:' + scope) as keyof IScope].description]);
    } else {
      messages.push(['read', Scope.properties[('read:' + scope) as keyof IScope].description]);
    }
  }

  return messages;
}
