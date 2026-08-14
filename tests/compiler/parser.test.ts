import { describe, expect, test } from 'vitest';
import { parseProgram } from '../../sources/compiler/parser';

describe('parseProgram', () => {
  test('parses legacy with statements in script mode', () => {
    const program = parseProgram('with (ctx) { value }', {
      sourceType: 'script',
    });

    expect(program.sourceType).toBe('script');
    expect(program.body[0]?.type).toBe('WithStatement');
  });

  test('parses modern ECMAScript modules', () => {
    const program = parseProgram(
      'export const value = input?.value ?? 0',
      { sourceType: 'module' },
    );

    expect(program.sourceType).toBe('module');
    expect(program.body[0]?.type).toBe('ExportNamedDeclaration');
  });

  test('rejects with statements in module mode', () => {
    expect(() => parseProgram('with (ctx) {}', { sourceType: 'module' }))
      .toThrow();
  });
});
