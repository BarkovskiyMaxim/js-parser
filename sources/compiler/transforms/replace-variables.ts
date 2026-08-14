import { parseExpression } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { ProgramTransform } from '../transform';

export type ReplaceVariableName = (
  variableName: string,
  existsInFunctionArgs: boolean,
) => string;

export function createReplaceVariablesTransform(
  knownNames: readonly string[] = [],
  replaceName: ReplaceVariableName = (name) => name,
): ProgramTransform {
  const known = new Set(knownNames);

  return (program) => {
    traverse(t.file(program), {
      ReferencedIdentifier(path) {
        const { name } = path.node;
        const exists = known.has(name) || path.scope.hasBinding(name);
        const replacement = replaceName(name, exists);

        if (replacement === name) return;

        const expression = parseExpression(replacement);
        if (path.parentPath.isObjectProperty({ shorthand: true })) {
          path.parentPath.node.shorthand = false;
        }
        path.replaceWith(t.cloneNode(expression, true));
        path.skip();
      },
    });
  };
}
