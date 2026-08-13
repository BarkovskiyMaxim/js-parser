import { afterEach, describe, expect, test } from 'vitest';
import { compile } from '../../sources/safe/compile';
import { executeSerializedProgram } from '../../sources/safe/module';
import { allowValue } from '../../sources/safe/policy';

const dataUrl = (source: string) => (
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__safeRuntime;
});

describe('instrumented Safe IR modules', () => {
  test('imports and executes serialized IR through the runtime entry', async () => {
    (globalThis as Record<string, unknown>).__safeRuntime = executeSerializedProgram;
    const runtimeImport = dataUrl(`
      export const executeSerializedProgram = (...args) =>
        globalThis.__safeRuntime(...args);
    `);
    const artifact = compile('Math.max(1, 4);', {
      policy: {
        globals: { Math: allowValue(Math, { call: ['max'] }) },
      },
    }).toModule({ mode: 'instrumented', runtimeImport });

    const generated = await import(dataUrl(artifact.code));
    expect(generated.execute({
      globals: { Math: allowValue(Math, { call: ['max'] }) },
    })).toBe(4);
    expect(generated.ir.version).toBe(1);
  });

  test('preserves runtime denial for computed reflective keys', async () => {
    (globalThis as Record<string, unknown>).__safeRuntime = executeSerializedProgram;
    const runtimeImport = dataUrl(`
      export const executeSerializedProgram = (...args) =>
        globalThis.__safeRuntime(...args);
    `);
    const artifact = compile('host[key];', {
      policy: {
        globals: {
          host: allowValue({}, { read: ['constructor'] }),
          key: allowValue('constructor'),
        },
      },
    }).toModule({ mode: 'instrumented', runtimeImport });
    const generated = await import(dataUrl(artifact.code));

    expect(() => generated.execute({
      globals: {
        host: allowValue({}, { read: ['constructor'] }),
        key: allowValue('constructor'),
      },
    })).toThrowError(/denied/i);
  });

  test('contains only serialized IR and no dynamic or native source', () => {
    const artifact = compile('1 + 2;').toModule({ mode: 'instrumented' });

    expect(artifact.code).not.toContain('eval(');
    expect(artifact.code).not.toContain('Function(');
    expect(artifact.code).not.toContain('1 + 2');
    expect(artifact.code).toContain('"version":1');
  });
});
