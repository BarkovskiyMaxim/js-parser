import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { NormalizedProgram } from '../compiler/ast';
import type { SourceContext } from '../compiler/transform';
import { SafeJavaScriptError } from './errors';
import type { NormalizedSafePolicy } from './policy';

const reflectiveKeys = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'caller',
  'callee',
  'arguments',
]);

const rangeOf = (node: t.Node) => (
  node.start == null || node.end == null
    ? undefined
    : { start: node.start, end: node.end }
);

const reject = (
  code: 'POLICY_SYNTAX_DENIED' | 'POLICY_GLOBAL_DENIED' | 'POLICY_REFLECTIVE_ACCESS',
  message: string,
  node: t.Node,
  source: Readonly<SourceContext>,
  rule: string,
): never => {
  throw new SafeJavaScriptError(code, message, {
    filename: source.filename,
    range: rangeOf(node),
    rule,
  });
};

const staticMemberKey = (
  node: t.MemberExpression | t.OptionalMemberExpression,
): string | undefined => {
  if (!node.computed && t.isIdentifier(node.property)) {
    return node.property.name;
  }
  if (node.computed && t.isStringLiteral(node.property)) {
    return node.property.value;
  }
  if (
    node.computed
    && t.isTemplateLiteral(node.property)
    && node.property.expressions.length === 0
  ) {
    return node.property.quasis[0]?.value.cooked;
  }
  return undefined;
};

export function validateProgram(
  program: NormalizedProgram,
  policy: NormalizedSafePolicy,
  source: Readonly<SourceContext> = {},
): void {
  const checkMember = (
    path: NodePath<t.MemberExpression | t.OptionalMemberExpression>,
  ) => {
    const key = staticMemberKey(path.node);
    if (key !== undefined && reflectiveKeys.has(key)) {
      reject(
        'POLICY_REFLECTIVE_ACCESS',
        'Reflective property access is denied',
        path.node.property,
        source,
        'property.reflective',
      );
    }
  };

  traverse(t.file(program), {
    ReferencedIdentifier(path) {
      const name = path.node.name;
      if (path.scope.getBinding(name) === undefined && !(name in policy.globals)) {
        reject(
          'POLICY_GLOBAL_DENIED',
          'Global access is denied',
          path.node,
          source,
          'global.read',
        );
      }
    },
    Function(path) {
      if (!policy.syntax.functions) {
        reject(
          'POLICY_SYNTAX_DENIED',
          'Function syntax is denied',
          path.node,
          source,
          'syntax.functions',
        );
      }
    },
    'WhileStatement|DoWhileStatement|ForStatement|ForInStatement|ForOfStatement'(path) {
      if (!policy.syntax.loops) {
        reject(
          'POLICY_SYNTAX_DENIED',
          'Loop syntax is denied',
          path.node,
          source,
          'syntax.loops',
        );
      }
    },
    Class(path) {
      if (!policy.syntax.classes) {
        reject(
          'POLICY_SYNTAX_DENIED',
          'Class syntax is denied',
          path.node,
          source,
          'syntax.classes',
        );
      }
    },
    ImportDeclaration(path) {
      if (!policy.syntax.imports) {
        reject(
          'POLICY_SYNTAX_DENIED',
          'Import syntax is denied',
          path.node,
          source,
          'syntax.imports',
        );
      }
    },
    MemberExpression: checkMember,
    OptionalMemberExpression: checkMember,
  });
}
