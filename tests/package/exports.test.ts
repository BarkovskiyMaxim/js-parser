import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

type PackageJson = {
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
    expect(manifest.main).toBe('./dist/index.js');
    expect(manifest.types).toBe('./dist/index.d.ts');
    expect(manifest.files).toEqual(['dist', 'README.md', 'LICENSE']);
    expect(manifest.exports).toMatchObject({
      '.': {
        types: './dist/index.d.ts',
        require: './dist/index.js',
      },
      './executors/*': {
        types: './dist/executors/*.d.ts',
        require: './dist/executors/*.js',
      },
      './parser/*': {
        types: './dist/parser/*.d.ts',
        require: './dist/parser/*.js',
      },
      './operands/*': {
        types: './dist/operands/*.d.ts',
        require: './dist/operands/*.js',
      },
    });
  });
});
