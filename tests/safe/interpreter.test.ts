import { expect, test } from 'vitest';
import { parseProgram } from '../../sources/compiler/parser';
import { executeProgram } from '../../sources/safe/interpreter';
import { lowerProgram } from '../../sources/safe/lower';
import { normalizePolicy } from '../../sources/safe/policy';

const run = (source: string) => executeProgram(
  lowerProgram(parseProgram(source, { sourceType: 'script' })),
  normalizePolicy({ syntax: { functions: true, loops: true } }),
);

test('executes lexical closures, branches, loops, and returns', () => {
  expect(run(`
    function make(base) {
      return function add(value) {
        let total = 0;
        while (value > 0) {
          total = total + 1;
          value = value - 1;
        }
        if (total > 2) return base + total;
        return base;
      };
    }
    const add = make(10);
    add(3);
  `)).toBe(13);
});

test('binds safe method receivers and preserves lexical arrow this', () => {
  expect(run(`
    const counter = {
      value: 4,
      add: function (amount) {
        const read = () => this.value;
        return read() + amount;
      }
    };
    counter.add(3);
  `)).toBe(7);
});
