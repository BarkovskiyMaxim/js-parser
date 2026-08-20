import * as t from '@babel/types';
import type { NormalizedProgram } from '../compiler/ast';
import { SafeJavaScriptError, type SourceRange } from './errors';
import type { SafeExpression, SafeProgram, SafeStatement } from './ir';

const rangeOf = (node: t.Node): SourceRange | undefined => (
  node.start == null || node.end == null
    ? undefined
    : { start: node.start, end: node.end }
);

const unsupported = (node: t.Node): never => {
  throw new SafeJavaScriptError(
    'PARSE_UNSUPPORTED_SYNTAX',
    `Unsupported syntax: ${node.type}`,
    { range: rangeOf(node), rule: `syntax.${node.type}` },
  );
};

const literalKey = (member: t.MemberExpression): SafeExpression => {
  if (!member.computed && t.isIdentifier(member.property)) {
    return { kind: 'literal', value: member.property.name, range: rangeOf(member.property) };
  }
  if (t.isExpression(member.property)) return lowerExpression(member.property);
  return unsupported(member.property);
};

const lowerArguments = (
  args: Array<t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder>,
): SafeExpression[] => args.map((argument) => (
  t.isExpression(argument) ? lowerExpression(argument) : unsupported(argument)
));

const lowerFunction = (
  node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression,
): SafeExpression => {
  const params = node.params.map((param) => (
    t.isIdentifier(param) ? param.name : unsupported(param)
  ));
  const body = t.isBlockStatement(node.body)
    ? lowerStatements(node.body.body)
    : [{ kind: 'return' as const, value: lowerExpression(node.body), range: rangeOf(node.body) }];
  return {
    kind: 'function',
    name: t.isArrowFunctionExpression(node) ? undefined : node.id?.name,
    params,
    body,
    thisMode: t.isArrowFunctionExpression(node) ? 'lexical' : 'dynamic',
    range: rangeOf(node),
  };
};

function lowerExpression(node: t.Expression): SafeExpression {
  const range = rangeOf(node);
  if (t.isIdentifier(node)) {
    return { kind: 'readVariable', name: node.name, range };
  }
  if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) {
    return { kind: 'literal', value: node.value, range };
  }
  if (t.isNullLiteral(node)) return { kind: 'literal', value: null, range };
  if (t.isThisExpression(node)) return { kind: 'this', range };
  if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
    return {
      kind: 'binary',
      operator: node.operator,
      left: lowerExpression(node.left as t.Expression),
      right: lowerExpression(node.right),
      range,
    };
  }
  if (t.isUnaryExpression(node) && t.isExpression(node.argument)) {
    return { kind: 'unary', operator: node.operator, argument: lowerExpression(node.argument), range };
  }
  if (t.isMemberExpression(node)) {
    if (!t.isExpression(node.object)) return unsupported(node.object);
    return {
      kind: 'readProperty',
      object: lowerExpression(node.object),
      key: literalKey(node),
      range,
    };
  }
  if (t.isAssignmentExpression(node) && node.operator === '=') {
    const value = lowerExpression(node.right);
    if (t.isIdentifier(node.left)) {
      return { kind: 'writeVariable', name: node.left.name, value, range };
    }
    if (t.isMemberExpression(node.left) && t.isExpression(node.left.object)) {
      return {
        kind: 'writeProperty',
        object: lowerExpression(node.left.object),
        key: literalKey(node.left),
        value,
        range,
      };
    }
    return unsupported(node.left);
  }
  if (t.isCallExpression(node)) {
    const args = lowerArguments(node.arguments);
    if (t.isMemberExpression(node.callee) && t.isExpression(node.callee.object)) {
      return {
        kind: 'call',
        receiver: lowerExpression(node.callee.object),
        key: literalKey(node.callee),
        args,
        range,
      };
    }
    if (t.isExpression(node.callee)) {
      return { kind: 'call', callee: lowerExpression(node.callee), args, range };
    }
    return unsupported(node.callee);
  }
  if (t.isNewExpression(node) && t.isExpression(node.callee)) {
    return {
      kind: 'construct',
      constructor: lowerExpression(node.callee),
      args: lowerArguments(node.arguments),
      range,
    };
  }
  if (t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
    return lowerFunction(node);
  }
  if (t.isArrayExpression(node)) {
    return {
      kind: 'array',
      values: node.elements.map((element) => (
        element && t.isExpression(element) ? lowerExpression(element) : unsupported(element ?? node)
      )),
      range,
    };
  }
  if (t.isObjectExpression(node)) {
    return {
      kind: 'object',
      entries: node.properties.map((property) => {
        if (!t.isObjectProperty(property) || !t.isExpression(property.value)) return unsupported(property);
        const key = t.isIdentifier(property.key) && !property.computed
          ? property.key.name
          : t.isStringLiteral(property.key)
            ? property.key.value
            : undefined;
        if (key === undefined) return unsupported(property.key);
        return { key, value: lowerExpression(property.value) };
      }),
      range,
    };
  }
  return unsupported(node);
}

const asBody = (statement: t.Statement): SafeStatement[] => (
  t.isBlockStatement(statement) ? lowerStatements(statement.body) : lowerStatement(statement)
);

function lowerStatement(statement: t.Statement): SafeStatement[] {
  const range = rangeOf(statement);
  if (t.isVariableDeclaration(statement)) {
    return statement.declarations.map((declaration) => {
      if (!t.isIdentifier(declaration.id)) return unsupported(declaration.id);
      return {
        kind: 'declare' as const,
        name: declaration.id.name,
        value: declaration.init && t.isExpression(declaration.init)
          ? lowerExpression(declaration.init)
          : undefined,
        range: rangeOf(declaration),
      };
    });
  }
  if (t.isFunctionDeclaration(statement)) {
    if (!statement.id) return unsupported(statement);
    return [{ kind: 'declare', name: statement.id.name, value: lowerFunction(statement), range }];
  }
  if (t.isExpressionStatement(statement)) {
    return [{ kind: 'expression', expression: lowerExpression(statement.expression), range }];
  }
  if (t.isIfStatement(statement)) {
    return [{
      kind: 'if',
      test: lowerExpression(statement.test),
      consequent: asBody(statement.consequent),
      alternate: statement.alternate
        ? (t.isIfStatement(statement.alternate)
            ? lowerStatement(statement.alternate)
            : asBody(statement.alternate))
        : [],
      range,
    }];
  }
  if (t.isWhileStatement(statement)) {
    return [{ kind: 'while', test: lowerExpression(statement.test), body: asBody(statement.body), range }];
  }
  if (t.isReturnStatement(statement)) {
    return [{
      kind: 'return',
      value: statement.argument ? lowerExpression(statement.argument) : undefined,
      range,
    }];
  }
  if (t.isThrowStatement(statement)) {
    return [{ kind: 'throw', value: lowerExpression(statement.argument), range }];
  }
  if (t.isEmptyStatement(statement)) return [];
  return unsupported(statement);
}

function lowerStatements(statements: t.Statement[]): SafeStatement[] {
  return statements.flatMap(lowerStatement);
}

export function lowerProgram(program: NormalizedProgram): SafeProgram {
  return { version: 1, body: lowerStatements(program.body), range: rangeOf(program) };
}
