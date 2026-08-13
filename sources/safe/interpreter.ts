import type { SafeExpression, SafeProgram, SafeStatement } from './ir';
import type { AllowedValue, NormalizedSafePolicy } from './policy';
import { SafeJavaScriptError } from './errors';
import { callProperty, readProperty, writeProperty } from './runtime';

interface RuntimeValue {
  value: unknown;
  capability?: AllowedValue;
}

type Environment = Map<string, RuntimeValue>;

const plain = (value: unknown): RuntimeValue => ({ value });

const propertyKey = (value: unknown): PropertyKey => {
  if (typeof value === 'string' || typeof value === 'symbol') return value;
  return String(value);
};

const readVariable = (
  name: string,
  environment: Environment,
  policy: NormalizedSafePolicy,
): RuntimeValue => {
  const local = environment.get(name);
  if (local) return local;
  const capability = policy.globals[name];
  if (capability) return { value: capability.value, capability };
  throw new SafeJavaScriptError(
    'RUNTIME_POLICY_VIOLATION',
    'Variable access was denied',
    { rule: 'global.read' },
  );
};

const binary = (operator: string, left: unknown, right: unknown): unknown => {
  switch (operator) {
    case '+': return (left as number) + (right as number);
    case '-': return (left as number) - (right as number);
    case '*': return (left as number) * (right as number);
    case '/': return (left as number) / (right as number);
    case '%': return (left as number) % (right as number);
    case '===': return left === right;
    case '!==': return left !== right;
    case '==': return left == right;
    case '!=': return left != right;
    case '>': return (left as number) > (right as number);
    case '>=': return (left as number) >= (right as number);
    case '<': return (left as number) < (right as number);
    case '<=': return (left as number) <= (right as number);
    case '&&': return left && right;
    case '||': return left || right;
    case '??': return left ?? right;
    default: throw new SafeJavaScriptError(
      'PARSE_UNSUPPORTED_SYNTAX',
      'Binary operator is unsupported',
      { rule: `operator.${operator}` },
    );
  }
};

const evaluateExpression = (
  expression: SafeExpression,
  environment: Environment,
  policy: NormalizedSafePolicy,
): RuntimeValue => {
  switch (expression.kind) {
    case 'literal': return plain(expression.value);
    case 'readVariable': return readVariable(expression.name, environment, policy);
    case 'binary': return plain(binary(
      expression.operator,
      evaluateExpression(expression.left, environment, policy).value,
      evaluateExpression(expression.right, environment, policy).value,
    ));
    case 'unary': {
      const argument = evaluateExpression(expression.argument, environment, policy).value;
      if (expression.operator === '!') return plain(!argument);
      if (expression.operator === '-') return plain(-(argument as number));
      if (expression.operator === '+') return plain(+(argument as number));
      if (expression.operator === 'typeof') return plain(typeof argument);
      throw new SafeJavaScriptError(
        'PARSE_UNSUPPORTED_SYNTAX',
        'Unary operator is unsupported',
        { rule: `operator.${expression.operator}` },
      );
    }
    case 'readProperty': {
      const object = evaluateExpression(expression.object, environment, policy);
      const key = propertyKey(evaluateExpression(expression.key, environment, policy).value);
      return plain(readProperty(object.capability, object.value, key));
    }
    case 'writeProperty': {
      const object = evaluateExpression(expression.object, environment, policy);
      const key = propertyKey(evaluateExpression(expression.key, environment, policy).value);
      const value = evaluateExpression(expression.value, environment, policy).value;
      return plain(writeProperty(object.capability, object.value, key, value));
    }
    case 'writeVariable': {
      if (!environment.has(expression.name)) {
        throw new SafeJavaScriptError(
          'RUNTIME_POLICY_VIOLATION',
          'Variable write was denied',
          { rule: 'global.write' },
        );
      }
      const value = evaluateExpression(expression.value, environment, policy);
      environment.set(expression.name, value);
      return value;
    }
    case 'call': {
      const args = expression.args.map((argument) => (
        evaluateExpression(argument, environment, policy).value
      ));
      if (expression.receiver && expression.key) {
        const receiver = evaluateExpression(expression.receiver, environment, policy);
        const key = propertyKey(evaluateExpression(expression.key, environment, policy).value);
        return plain(callProperty(receiver.capability, receiver.value, key, args));
      }
      throw new SafeJavaScriptError(
        'RUNTIME_POLICY_VIOLATION',
        'Direct calls are not enabled yet',
        { rule: 'value.call' },
      );
    }
    default:
      throw new SafeJavaScriptError(
        'PARSE_UNSUPPORTED_SYNTAX',
        'Expression is not implemented by this runtime',
        { rule: `ir.${expression.kind}` },
      );
  }
};

const executeStatement = (
  statement: SafeStatement,
  environment: Environment,
  policy: NormalizedSafePolicy,
): RuntimeValue => {
  if (statement.kind === 'expression') {
    return evaluateExpression(statement.expression, environment, policy);
  }
  if (statement.kind === 'declare') {
    const value = statement.value
      ? evaluateExpression(statement.value, environment, policy)
      : plain(undefined);
    environment.set(statement.name, value);
    return value;
  }
  throw new SafeJavaScriptError(
    'PARSE_UNSUPPORTED_SYNTAX',
    'Statement is not implemented by this runtime',
    { rule: `ir.${statement.kind}` },
  );
};

export function executeProgram(
  program: SafeProgram,
  policy: NormalizedSafePolicy,
): unknown {
  if (program.version !== 1) {
    throw new SafeJavaScriptError(
      'UNSUPPORTED_IR_VERSION',
      'Safe IR version is unsupported',
    );
  }
  const environment: Environment = new Map();
  let result: RuntimeValue = plain(undefined);
  for (const statement of program.body) {
    result = executeStatement(statement, environment, policy);
  }
  return result.value;
}
