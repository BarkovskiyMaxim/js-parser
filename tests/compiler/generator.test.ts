import { describe, expect, test } from 'vitest';
import { generateProgram } from '../../sources/compiler/generator';
import { parseProgram } from '../../sources/compiler/parser';
import { transformSource } from '../../sources/compiler/transform';

describe('generateProgram', () => {
  test('generates modern JavaScript deterministically', () => {
    const ast = parseProgram('const answer = input?.value ?? 42', {
      sourceType: 'script',
    });

    const first = generateProgram(ast);
    const second = generateProgram(ast);

    expect(first.code).toBe('const answer = input?.value ?? 42;');
    expect(second.code).toBe(first.code);
  });

  test('does not introduce dynamic code generation', () => {
    const ast = parseProgram('const answer = input + 1', {
      sourceType: 'script',
    });
    const output = generateProgram(ast).code;

    expect(output).not.toContain('eval(');
    expect(output).not.toContain('Function(');
  });

  test('serializes a transformed program directly', () => {
    const result = transformSource('const value = source', {
      sourceType: 'script',
    });

    expect(result.toString()).toBe('const value = source;');
  });
});
