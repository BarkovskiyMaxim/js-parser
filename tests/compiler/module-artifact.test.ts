import { describe, expect, test } from 'vitest';
import { compile } from '../../sources/safe/compile';
import { transformSource } from '../../sources/compiler/transform';

describe('plain module artifacts', () => {
  test('generates deterministic JavaScript with an optional source map', () => {
    const result = transformSource('export const value = input?.value ?? 0', {
      sourceType: 'module',
      filename: 'binding.js',
    });

    const first = result.toModule({ sourceMaps: true });
    const second = result.toModule({ sourceMaps: true });

    expect(first.code).toBe('export const value = input?.value ?? 0;');
    expect(second).toEqual(first);
    expect(first.map).toMatchObject({
      version: 3,
      sources: ['binding.js'],
      sourcesContent: ['export const value = input?.value ?? 0'],
    });
    expect(first.map?.mappings).not.toBe('');
  });

  test('exposes trusted plain output through CompiledProgram', () => {
    const program = compile('1 + 2;');
    const artifact = program.toModule({ mode: 'plain' });

    expect(artifact.code).toBe('1 + 2;');
    expect(artifact.code).not.toContain('eval(');
    expect(artifact.code).not.toContain('Function(');
  });
});
