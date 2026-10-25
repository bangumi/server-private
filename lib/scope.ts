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
  'read:topic': '获取讨论',
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

/** `null` 表示该凭据不受 scope 限制，与旧站签发的 token 和站点自身登录保持一致 */
export type TokenScope = readonly string[] | null;

/**
 * 解析 `chii_oauth_access_tokens.scope` / `chii_oauth_refresh_tokens.scope`。 列内容为空表示 legacy token，不受
 * scope 限制；无法解析的内容不授予任何 scope。
 */
export function parseScopeColumn(raw: string | null | undefined): TokenScope {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) {
    // 数组是本站旧版本写入的格式，同样按不受限制处理，避免影响已签发的 token
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return [];
  }

  return Object.entries(parsed as Record<string, unknown>)
    .filter(([, enabled]) => enabled === true)
    .map(([name]) => name);
}

/** 写入 scope 列的格式，与 bangumi/server 的 `parseTokenScope` 保持一致 */
export function scopeColumnValue(scopes: readonly string[]): string {
  return JSON.stringify(Object.fromEntries(scopes.map((scope) => [scope, true])));
}

export function hasScope(scope: TokenScope, required: string): boolean {
  return scope === null || scope.includes(required);
}

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
