import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

type PackageJson = {
  type?: string;
  main?: string;
  types?: string;
  files?: string[];
  exports?: Record<string, unknown>;
};

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as PackageJson;

describe('package manifest', () => {
  test('publishes the root and all legacy path families', () => {
    expect(manifest.type).toBe('commonjs');
    expect(manifest.main).toBe('./dist/index.js');
    expect(manifest.types).toBe('./dist/index.d.ts');
    expect(manifest.files).toEqual(['dist', 'README.md', 'LICENSE']);
    expect(manifest.exports).toMatchObject({
      '.': {
        require: {
          types: './dist/index.d.ts',
          default: './dist/index.js',
        },
      },
      './executors/*': {
        require: {
          types: './dist/executors/*.d.ts',
          default: './dist/executors/*.js',
        },
      },
      './parser/*': {
        require: {
          types: './dist/parser/*.d.ts',
          default: './dist/parser/*.js',
        },
      },
      './operands/*': {
        require: {
          types: './dist/operands/*.d.ts',
          default: './dist/operands/*.js',
        },
      },
    });
  });
});
