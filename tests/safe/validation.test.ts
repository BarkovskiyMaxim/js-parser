import { describe, expect, test } from 'vitest';
import { parseProgram } from '../../sources/compiler/parser';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { allowValue, normalizePolicy } from '../../sources/safe/policy';
import { validateProgram } from '../../sources/safe/validate';

const validate = (
  source: string,
  policy = normalizePolicy(),
  sourceType: 'script' | 'module' = 'script',
) => validateProgram(parseProgram(source, { sourceType }), policy, {
  filename: 'input.js',
});

const expectCode = (run: () => void, code: string) => {
  try {
    run();
    throw new Error('Expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(SafeJavaScriptError);
    expect((error as SafeJavaScriptError).code).toBe(code);
  }
};

describe('validateProgram', () => {
  test.each([
    'globalThis',
    'window',
    'self',
    'process',
    'require',
    'module',
    'eval',
    'Function',
  ])('denies ambient global %s', (name) => {
    expectCode(() => validate(`${name};`), 'POLICY_GLOBAL_DENIED');
  });

  test('accepts only explicitly allowed globals', () => {
    const policy = normalizePolicy({
      globals: { Math: allowValue(Math, { call: ['max'] }) },
    });

    expect(() => validate('Math.max(1, 2);', policy)).not.toThrow();
    expectCode(() => validate('Object.keys({});', policy), 'POLICY_GLOBAL_DENIED');
  });

  test.each([
    'value.__proto__',
    'value["prototype"]',
    "value['constructor']",
    'value.caller',
    'value.callee',
    'value.arguments',
  ])('always denies reflective access: %s', (source) => {
    const policy = normalizePolicy({
      globals: { value: allowValue({}) },
    });
    expectCode(() => validate(`${source};`, policy), 'POLICY_REFLECTIVE_ACCESS');
  });

  test.each([
    ['functions', 'const fn = () => 1;', { functions: true }],
    ['loops', 'while (false) {}', { loops: true }],
    ['classes', 'class Item {}', { classes: true }],
    ['imports', 'import value from "allowed";', { imports: true }],
  ] as const)('controls %s syntax independently', (_name, source, syntax) => {
    expectCode(
      () => validate(source, normalizePolicy(), source.includes('import') ? 'module' : 'script'),
      'POLICY_SYNTAX_DENIED',
    );
    expect(() => validate(
      source,
      normalizePolicy({ syntax }),
      source.includes('import') ? 'module' : 'script',
    )).not.toThrow();
  });
});
