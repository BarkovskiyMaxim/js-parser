import { describe, expect, test } from 'vitest';
import { parseProgram } from '../../sources/compiler/parser';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { lowerProgram } from '../../sources/safe/lower';

const lower = (source: string) => lowerProgram(parseProgram(source, {
  sourceType: 'script',
}));

describe('lowerProgram', () => {
  test('lowers variable reads and pure arithmetic explicitly', () => {
    const ir = lower('const answer = input + 1;');

    expect(ir.version).toBe(1);
    expect(ir.body[0]).toMatchObject({
      kind: 'declare',
      name: 'answer',
      value: {
        kind: 'binary',
        operator: '+',
        left: { kind: 'readVariable', name: 'input' },
        right: { kind: 'literal', value: 1 },
      },
    });
  });

  test('distinguishes property reads, writes, method calls, and constructors', () => {
    const ir = lower(`
      target[key] = source.value;
      target.run(argument);
      new Factory(argument);
    `);

    expect(ir.body.map((statement) => statement.kind)).toEqual([
      'expression',
      'expression',
      'expression',
    ]);
    expect(ir.body[0]).toMatchObject({
      expression: {
        kind: 'writeProperty',
        object: { kind: 'readVariable', name: 'target' },
        key: { kind: 'readVariable', name: 'key' },
        value: {
          kind: 'readProperty',
          object: { kind: 'readVariable', name: 'source' },
          key: { kind: 'literal', value: 'value' },
        },
      },
    });
    expect(ir.body[1]).toMatchObject({
      expression: {
        kind: 'call',
        receiver: { kind: 'readVariable', name: 'target' },
        key: { kind: 'literal', value: 'run' },
      },
    });
    expect(ir.body[2]).toMatchObject({
      expression: {
        kind: 'construct',
        constructor: { kind: 'readVariable', name: 'Factory' },
      },
    });
  });

  test('lowers functions, branches, loops, returns, and throws', () => {
    const ir = lower(`
      function choose(value) {
        while (value) {
          if (value > 1) return value;
          throw value;
        }
      }
    `);

    expect(ir.body[0]).toMatchObject({
      kind: 'declare',
      name: 'choose',
      value: {
        kind: 'function',
        name: 'choose',
        params: ['value'],
        body: [{
          kind: 'while',
          body: [{
            kind: 'if',
            consequent: [{ kind: 'return' }],
          }, { kind: 'throw' }],
        }],
      },
    });
  });

  test('rejects unsupported syntax with a stable error', () => {
    try {
      lower('class Item {}');
      throw new Error('Expected lowering to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SafeJavaScriptError);
      expect((error as SafeJavaScriptError).code)
        .toBe('PARSE_UNSUPPORTED_SYNTAX');
    }
  });
});
