import * as t from '@babel/types';
import { describe, expect, test } from 'vitest';
import { compile } from '../../sources/safe/compile';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { allowValue } from '../../sources/safe/policy';

describe('compile', () => {
  test('executes literals under the default deny-by-default policy', () => {
    const program = compile('1 + 2 * 3;');

    expect(program.execute()).toBe(7);
    expect(program.ir.version).toBe(1);
    expect(program.toString()).toBe('1 + 2 * 3;');
  });

  test('denies ambient globals by default', () => {
    expect(() => compile('process;')).toThrow(SafeJavaScriptError);
    expect(() => compile('window;')).toThrow(SafeJavaScriptError);
  });

  test('executes an explicitly allowed capability', () => {
    const program = compile('Math.max(1, 4);', {
      policy: {
        globals: {
          Math: allowValue(Math, { call: ['max'] }),
        },
      },
    });

    expect(program.execute()).toBe(4);
  });

  test('validates the final transformed program', () => {
    expect(() => compile('1;', {
      transforms: [
        (program) => {
          program.body = [t.expressionStatement(t.identifier('process'))];
        },
      ],
    })).toThrow(SafeJavaScriptError);
  });

  test('context overrides only declared capabilities and preserves permissions', () => {
    const program = compile('service.value;', {
      policy: {
        globals: {
          service: allowValue({ value: 1 }, { read: ['value'] }),
        },
      },
    });

    expect(program.execute({ service: { value: 2 } })).toBe(2);
    expect(() => program.execute({ undeclared: 1 })).toThrow(SafeJavaScriptError);
  });
});
