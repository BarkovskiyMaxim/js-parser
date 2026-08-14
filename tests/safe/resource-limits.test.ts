import { expect, test } from 'vitest';
import { parseProgram } from '../../sources/compiler/parser';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { executeProgram } from '../../sources/safe/interpreter';
import { lowerProgram } from '../../sources/safe/lower';
import { normalizePolicy } from '../../sources/safe/policy';

const expectLimit = (source: string, limit: string, limits: {
  operations?: number;
  callDepth?: number;
  allocations?: number;
}) => {
  try {
    executeProgram(
      lowerProgram(parseProgram(source, { sourceType: 'script' })),
      normalizePolicy({
        syntax: { functions: true, loops: true },
        limits,
      }),
    );
    throw new Error('Expected resource limit');
  } catch (error) {
    expect(error).toBeInstanceOf(SafeJavaScriptError);
    expect((error as SafeJavaScriptError).code).toBe('RESOURCE_LIMIT_EXCEEDED');
    expect((error as SafeJavaScriptError).limit).toBe(limit);
  }
};

test('stops infinite loops at the operation budget', () => {
  expectLimit('while (true) {}', 'operations', { operations: 20 });
});

test('stops recursive calls at the call-depth budget', () => {
  expectLimit('function recurse() { return recurse(); } recurse();', 'callDepth', {
    callDepth: 4,
  });
});

test('stops allocations at their independent budget', () => {
  expectLimit('const first = {}; const second = [];', 'allocations', {
    allocations: 1,
  });
});
