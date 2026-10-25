import { describe, expect, test } from 'vitest';

import { hasScope, parseScopeColumn, scopeColumnValue } from './scope.ts';

describe('parse scope column', () => {
  test('empty column is not restricted', () => {
    expect(parseScopeColumn(null)).toBeNull();
    expect(parseScopeColumn(undefined)).toBeNull();
    expect(parseScopeColumn('')).toBeNull();
  });

  test('array column written by old version is not restricted', () => {
    expect(parseScopeColumn('["write:collection"]')).toBeNull();
    expect(parseScopeColumn('["read:collection","write:wiki"]')).toBeNull();
  });

  test('object column only grants enabled scopes', () => {
    expect(parseScopeColumn('{"write:collection":true,"write:wiki":false}')).toEqual([
      'write:collection',
    ]);
    expect(parseScopeColumn('{}')).toEqual([]);
  });

  test('unparsable column grants nothing', () => {
    expect(parseScopeColumn('write:collection')).toEqual([]);
    expect(parseScopeColumn('{"write:collection":true')).toEqual([]);
    expect(parseScopeColumn('"write:collection"')).toEqual([]);
  });
});

describe('scope column value', () => {
  test('should be readable by parseScopeColumn', () => {
    const scopes = ['write:collection', 'write:wiki'];

    expect(scopeColumnValue(scopes)).toBe('{"write:collection":true,"write:wiki":true}');
    expect(parseScopeColumn(scopeColumnValue(scopes))).toEqual(scopes);
  });
});

describe('has scope', () => {
  test('null scope is not restricted', () => {
    expect(hasScope(null, 'write:wiki')).toBe(true);
  });

  test('empty scope grants nothing', () => {
    expect(hasScope([], 'write:wiki')).toBe(false);
  });

  test('listed scope is granted', () => {
    expect(hasScope(['write:wiki'], 'write:wiki')).toBe(true);
    expect(hasScope(['read:wiki'], 'write:wiki')).toBe(false);
  });
});
