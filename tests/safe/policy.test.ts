import { describe, expect, test } from 'vitest';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import {
  allowValue,
  normalizePolicy,
} from '../../sources/safe/policy';

describe('strict policy primitives', () => {
  test('normalizes an omitted policy without ambient capabilities', () => {
    const policy = normalizePolicy();

    expect(policy.globals).toEqual({});
    expect(policy.syntax).toEqual({
      functions: false,
      loops: false,
      classes: false,
      imports: false,
    });
    expect(policy.limits).toEqual({
      operations: 10_000,
      callDepth: 32,
      allocations: 1_000,
    });
  });

  test('copies and freezes independent capability permissions', () => {
    const read = ['value'];
    const capability = allowValue({ value: 1 }, {
      read,
      write: ['result'],
      call: ['run'],
      construct: ['Item'],
    });
    read.push('secret');

    expect(capability.permissions).toEqual({
      read: ['value'],
      write: ['result'],
      call: ['run'],
      construct: ['Item'],
    });
    expect(Object.isFrozen(capability.permissions)).toBe(true);
    expect(Object.isFrozen(capability.permissions.read)).toBe(true);
  });

  test('stable errors do not expose runtime values', () => {
    const secret = { token: 'do-not-print' };
    const error = new SafeJavaScriptError(
      'RUNTIME_POLICY_VIOLATION',
      'Property access was denied',
      { filename: 'binding.js', rule: 'property.read', cause: secret },
    );

    expect(error.code).toBe('RUNTIME_POLICY_VIOLATION');
    expect(error.filename).toBe('binding.js');
    expect(error.rule).toBe('property.read');
    expect(error.cause).toBe(secret);
    expect(String(error)).not.toContain('do-not-print');
    expect(JSON.stringify(error)).not.toContain('do-not-print');
  });
});
