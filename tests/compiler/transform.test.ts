import * as t from '@babel/types';
import { describe, expect, test } from 'vitest';
import { transformSource } from '../../sources/compiler/transform';

describe('transformSource', () => {
  test('runs preprocessors before ordered AST transforms', () => {
    const order: string[] = [];
    const result = transformSource('__VALUE__', {
      sourceType: 'script',
      preprocessors: [
        (source) => {
          order.push('preprocess');
          return source.replace('__VALUE__', 'const value = 1');
        },
      ],
      transforms: [
        (program) => {
          order.push('first');
          const statement = program.body[0];
          if (!t.isVariableDeclaration(statement)) {
            throw new Error('Expected a variable declaration');
          }
          const identifier = statement.declarations[0]?.id;
          if (!t.isIdentifier(identifier)) {
            throw new Error('Expected an identifier');
          }
          identifier.name = 'first';
        },
        (program) => {
          order.push('second');
          const next = t.cloneNode(program, true);
          const statement = next.body[0];
          if (!t.isVariableDeclaration(statement)) {
            throw new Error('Expected a variable declaration');
          }
          const identifier = statement.declarations[0]?.id;
          if (!t.isIdentifier(identifier)) {
            throw new Error('Expected an identifier');
          }
          identifier.name = 'second';
          return next;
        },
      ],
    });

    expect(order).toEqual(['preprocess', 'first', 'second']);
    const statement = result.ast.body[0];
    expect(t.isVariableDeclaration(statement)
      && t.isIdentifier(statement.declarations[0]?.id)
      && statement.declarations[0].id.name).toBe('second');
  });

  test('isolates diagnostics between deterministic transformations', () => {
    let invocation = 0;
    const transform = (_program: t.Program, context: {
      diagnostics: Array<{ code: string; message: string }>;
    }) => {
      invocation += 1;
      if (invocation === 1) {
        context.diagnostics.push({ code: 'FIRST', message: 'first call' });
      }
    };

    const first = transformSource('const value = 1', {
      sourceType: 'script',
      transforms: [transform],
    });
    const second = transformSource('const value = 1', {
      sourceType: 'script',
      transforms: [transform],
    });

    expect(first.ast).toEqual(second.ast);
    expect(first.diagnostics).toEqual([
      { code: 'FIRST', message: 'first call' },
    ]);
    expect(second.diagnostics).toEqual([]);
  });
});
