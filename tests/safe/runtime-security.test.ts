import { describe, expect, test } from 'vitest';
import { parseProgram } from '../../sources/compiler/parser';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { executeProgram } from '../../sources/safe/interpreter';
import { lowerProgram } from '../../sources/safe/lower';
import { allowValue, normalizePolicy } from '../../sources/safe/policy';

const execute = (
  source: string,
  globals: Record<string, ReturnType<typeof allowValue>> = {},
) => executeProgram(
  lowerProgram(parseProgram(source, { sourceType: 'script' })),
  normalizePolicy({ globals }),
);

const expectRuntimeDenial = (run: () => unknown, rule: string) => {
  try {
    run();
    throw new Error('Expected runtime policy denial');
  } catch (error) {
    expect(error).toBeInstanceOf(SafeJavaScriptError);
    expect((error as SafeJavaScriptError).code)
      .toBe('RUNTIME_POLICY_VIOLATION');
    expect((error as SafeJavaScriptError).rule).toBe(rule);
  }
};

describe('runtime capability enforcement', () => {
  test('executes literals and pure operators without globals', () => {
    expect(execute('1 + 2 * 3;')).toBe(7);
  });

  test('does not let object availability imply property reads', () => {
    expectRuntimeDenial(
      () => execute('host.value;', { host: allowValue({ value: 2 }) }),
      'property.read',
    );
    expect(execute('host.value;', {
      host: allowValue({ value: 2 }, { read: ['value'] }),
    })).toBe(2);
  });

  test('checks call and write independently from reads', () => {
    const host = {
      value: 1,
      add(amount: number) {
        return this.value + amount;
      },
    };

    expectRuntimeDenial(
      () => execute('host.add(2);', {
        host: allowValue(host, { read: ['add'] }),
      }),
      'property.call',
    );
    expect(execute('host.add(2);', {
      host: allowValue(host, { call: ['add'] }),
    })).toBe(3);
    expectRuntimeDenial(
      () => execute('host.value = 4;', {
        host: allowValue(host, { read: ['value'] }),
      }),
      'property.write',
    );
    expect(execute('host.value = 4;', {
      host: allowValue(host, { write: ['value'] }),
    })).toBe(4);
  });

  test.each([
    '__proto__',
    'prototype',
    'constructor',
    'caller',
    'callee',
    'arguments',
  ])('always denies computed reflective key %s', (key) => {
    expectRuntimeDenial(
      () => execute('host[key];', {
        host: allowValue({}, { read: [key] }),
        key: allowValue(key),
      }),
      'property.reflective',
    );
  });

  test('checks read permission before invoking a getter', () => {
    let reads = 0;
    const host = Object.defineProperty({}, 'secret', {
      get() {
        reads += 1;
        return 42;
      },
    });

    expectRuntimeDenial(
      () => execute('host.secret;', { host: allowValue(host) }),
      'property.read',
    );
    expect(reads).toBe(0);
  });

  test('rejects raw global objects even when wrapped as capabilities', () => {
    expect(() => allowValue(globalThis)).toThrow(SafeJavaScriptError);
  });
});
