import { describe, expect, test } from 'vitest';
import { compile } from '../../sources/safe/compile';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { executeProgram } from '../../sources/safe/interpreter';
import type { SafeProgram } from '../../sources/safe/ir';
import { allowValue } from '../../sources/safe/policy';
import { normalizePolicy } from '../../sources/safe/policy';

const expectSafeError = (
  run: () => unknown,
  code: string,
  rule?: string,
) => {
  try {
    run();
    throw new Error('Expected safe JavaScript error');
  } catch (error) {
    expect(error).toBeInstanceOf(SafeJavaScriptError);
    expect((error as SafeJavaScriptError).code).toBe(code);
    if (rule) expect((error as SafeJavaScriptError).rule).toBe(rule);
  }
};

describe('cross-layer security conformance', () => {
  test.each([
    'globalThis',
    'window',
    'self',
    'process',
    'require',
    'module',
    'eval',
    'Function',
  ])('compile-time rejects ambient global %s', (name) => {
    expectSafeError(
      () => compile(`${name};`),
      'POLICY_GLOBAL_DENIED',
      'global.read',
    );
  });

  test.each([
    '__proto__',
    'prototype',
    'constructor',
    'caller',
    'callee',
    'arguments',
  ])('runtime rejects computed reflective key %s', (key) => {
    const program = compile('host[key];', {
      policy: {
        globals: {
          host: allowValue({}, { read: [key] }),
          key: allowValue(key),
        },
      },
    });
    expectSafeError(
      () => program.execute(),
      'RUNTIME_POLICY_VIOLATION',
      'property.reflective',
    );
  });

  test('does not turn a readable method into an indirectly callable function', () => {
    const program = compile('const alias = host.run; alias();', {
      policy: {
        globals: {
          host: allowValue({ run: () => 1 }, { read: ['run'] }),
        },
      },
    });
    expectSafeError(
      () => program.execute(),
      'RUNTIME_POLICY_VIOLATION',
      'value.call',
    );
  });

  const ambientFixtures: Array<readonly [string, unknown]> = [
    ['globalThis', globalThis],
    ['Function', Function],
    ['eval', eval],
  ];
  if (typeof process !== 'undefined') ambientFixtures.push(['process', process]);

  test.each(ambientFixtures)('rejects ambient object %s as a direct capability', (_name, value) => {
    expectSafeError(
      () => allowValue(value),
      'RUNTIME_POLICY_VIOLATION',
      'capability.ambient',
    );
  });

  test.each([
    ['read', 'host.escape;', { read: ['escape'] }],
    ['call', 'host.escape();', { call: ['escape'] }],
  ] as const)('rejects ambient values returned by allowed host %s', (
    _operation,
    source,
    permissions,
  ) => {
    const host = _operation === 'read'
      ? Object.defineProperty({}, 'escape', { get: () => globalThis })
      : { escape: () => globalThis };
    const program = compile(source, {
      policy: { globals: { host: allowValue(host, permissions) } },
    });
    expectSafeError(
      () => program.execute(),
      'RUNTIME_POLICY_VIOLATION',
      'capability.ambient-result',
    );
  });

  test('rejects unsupported serialized Safe IR versions', () => {
    const unsupported = { version: 2, body: [] } as unknown as SafeProgram;
    expectSafeError(
      () => executeProgram(unsupported, normalizePolicy()),
      'UNSUPPORTED_IR_VERSION',
    );
  });
});
