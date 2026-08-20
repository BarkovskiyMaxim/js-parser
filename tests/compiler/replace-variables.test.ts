import { describe, expect, test } from 'vitest';
import { transformSource } from '../../sources/compiler/transform';
import { createReplaceVariablesTransform } from '../../sources/compiler/transforms/replace-variables';

const replace = (
  source: string,
  knownNames: readonly string[] = [],
  calls: Array<[string, boolean]> = [],
) => transformSource(source, {
  sourceType: 'script',
  transforms: [createReplaceVariablesTransform(
    knownNames,
    (name, exists) => {
      calls.push([name, exists]);
      return exists ? name : `scope.${name}`;
    },
  )],
}).toString({ compact: true });

describe('createReplaceVariablesTransform', () => {
  test('distinguishes lexical bindings from free identifiers', () => {
    const calls: Array<[string, boolean]> = [];
    const output = replace(
      'function run(local) { const nested = local; return external + nested; }',
      [],
      calls,
    );

    expect(output).toBe(
      'function run(local){const nested=local;return scope.external+nested;}',
    );
    expect(calls).toEqual([
      ['local', true],
      ['external', false],
      ['nested', true],
    ]);
  });

  test('supports modern references and preserves property names', () => {
    const output = replace(
      'const result = user?.profile[key] ?? fallback.value;',
    );

    expect(output).toBe(
      'const result=scope.user?.profile[scope.key]??scope.fallback.value;',
    );
  });

  test('expands shorthand properties when replacing their values', () => {
    expect(replace('const result = { external };')).toBe(
      'const result={external:scope.external};',
    );
  });

  test('recognizes nested parameters and explicit known names', () => {
    const calls: Array<[string, boolean]> = [];
    const output = replace(
      'items.some((item) => item === external) && Math.max(total, 1)',
      ['Math'],
      calls,
    );

    expect(output).toBe(
      'scope.items.some(item=>item===scope.external)&&Math.max(scope.total,1);',
    );
    expect(calls).toEqual([
      ['items', false],
      ['item', true],
      ['external', false],
      ['Math', true],
      ['total', false],
    ]);
  });
});
