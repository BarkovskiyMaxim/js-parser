import { SafeJavaScriptError } from './errors';
import type { SafeExpression, SafeProgram, SafeStatement } from './ir';
import type { AllowedValue, NormalizedSafePolicy } from './policy';
import {
  callProperty,
  constructValue,
  readProperty,
  writeProperty,
} from './runtime';

interface RuntimeValue {
  value: unknown;
  capability?: AllowedValue;
}

interface RuntimeFunction {
  readonly type: 'safe-function';
  readonly params: string[];
  readonly body: SafeStatement[];
  readonly closure: Environment;
}

interface RuntimeState {
  operations: number;
  callDepth: number;
  allocations: number;
  readonly policy: NormalizedSafePolicy;
}

type Completion =
  | { type: 'normal'; value: RuntimeValue }
  | { type: 'return'; value: RuntimeValue }
  | { type: 'throw'; value: RuntimeValue };

class Environment {
  private readonly values = new Map<string, RuntimeValue>();

  constructor(private readonly parent?: Environment) {}

  declare(name: string, value: RuntimeValue): void {
    this.values.set(name, value);
  }

  read(name: string): RuntimeValue | undefined {
    return this.values.get(name) ?? this.parent?.read(name);
  }

  write(name: string, value: RuntimeValue): boolean {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return true;
    }
    return this.parent?.write(name, value) ?? false;
  }
}

const plain = (value: unknown): RuntimeValue => ({ value });
const normal = (value: RuntimeValue = plain(undefined)): Completion => ({
  type: 'normal',
  value,
});

const exceed = (limit: keyof NormalizedSafePolicy['limits']): never => {
  throw new SafeJavaScriptError(
    'RESOURCE_LIMIT_EXCEEDED',
    'Execution resource limit was exceeded',
    { limit },
  );
};

const tick = (state: RuntimeState): void => {
  state.operations -= 1;
  if (state.operations < 0) exceed('operations');
};

const allocate = (state: RuntimeState): void => {
  state.allocations -= 1;
  if (state.allocations < 0) exceed('allocations');
};

const propertyKey = (value: unknown): PropertyKey => {
  if (typeof value === 'string' || typeof value === 'symbol') return value;
  return String(value);
};

const isRuntimeFunction = (value: unknown): value is RuntimeFunction => (
  typeof value === 'object'
  && value !== null
  && (value as Partial<RuntimeFunction>).type === 'safe-function'
);

const readVariable = (
  name: string,
  environment: Environment,
  policy: NormalizedSafePolicy,
): RuntimeValue => {
  const local = environment.read(name);
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
    default: throw new SafeJavaScriptError(
      'PARSE_UNSUPPORTED_SYNTAX',
      'Binary operator is unsupported',
      { rule: `operator.${operator}` },
    );
  }
};

const invokeRuntimeFunction = (
  func: RuntimeFunction,
  args: RuntimeValue[],
  state: RuntimeState,
): RuntimeValue => {
  state.callDepth += 1;
  if (state.callDepth > state.policy.limits.callDepth) exceed('callDepth');
  try {
    const local = new Environment(func.closure);
    func.params.forEach((param, index) => local.declare(param, args[index] ?? plain(undefined)));
    const completion = executeStatements(func.body, local, state);
    if (completion.type === 'throw') throw completion.value.value;
    return completion.type === 'return' ? completion.value : plain(undefined);
  } finally {
    state.callDepth -= 1;
  }
};

const evaluateExpression = (
  expression: SafeExpression,
  environment: Environment,
  state: RuntimeState,
): RuntimeValue => {
  tick(state);
  switch (expression.kind) {
    case 'literal': return plain(expression.value);
    case 'readVariable': return readVariable(expression.name, environment, state.policy);
    case 'binary': {
      const left = evaluateExpression(expression.left, environment, state).value;
      if (expression.operator === '&&') {
        return left ? evaluateExpression(expression.right, environment, state) : plain(left);
      }
      if (expression.operator === '||') {
        return left ? plain(left) : evaluateExpression(expression.right, environment, state);
      }
      if (expression.operator === '??') {
        return left == null ? evaluateExpression(expression.right, environment, state) : plain(left);
      }
      return plain(binary(
        expression.operator,
        left,
        evaluateExpression(expression.right, environment, state).value,
      ));
    }
    case 'unary': {
      const argument = evaluateExpression(expression.argument, environment, state).value;
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
      const object = evaluateExpression(expression.object, environment, state);
      const key = propertyKey(evaluateExpression(expression.key, environment, state).value);
      return plain(readProperty(object.capability, object.value, key));
    }
    case 'writeProperty': {
      const object = evaluateExpression(expression.object, environment, state);
      const key = propertyKey(evaluateExpression(expression.key, environment, state).value);
      const value = evaluateExpression(expression.value, environment, state).value;
      return plain(writeProperty(object.capability, object.value, key, value));
    }
    case 'writeVariable': {
      const value = evaluateExpression(expression.value, environment, state);
      if (!environment.write(expression.name, value)) {
        throw new SafeJavaScriptError(
          'RUNTIME_POLICY_VIOLATION',
          'Variable write was denied',
          { rule: 'global.write' },
        );
      }
      return value;
    }
    case 'call': {
      const args = expression.args.map((argument) => (
        evaluateExpression(argument, environment, state)
      ));
      if (expression.receiver && expression.key) {
        const receiver = evaluateExpression(expression.receiver, environment, state);
        const key = propertyKey(evaluateExpression(expression.key, environment, state).value);
        return plain(callProperty(
          receiver.capability,
          receiver.value,
          key,
          args.map((arg) => arg.value),
        ));
      }
      if (expression.callee) {
        const callee = evaluateExpression(expression.callee, environment, state).value;
        if (isRuntimeFunction(callee)) return invokeRuntimeFunction(callee, args, state);
      }
      throw new SafeJavaScriptError(
        'RUNTIME_POLICY_VIOLATION',
        'Direct call was denied',
        { rule: 'value.call' },
      );
    }
    case 'function': {
      allocate(state);
      return plain({
        type: 'safe-function',
        params: expression.params,
        body: expression.body,
        closure: environment,
      } satisfies RuntimeFunction);
    }
    case 'array': {
      allocate(state);
      return plain(expression.values.map((value) => (
        evaluateExpression(value, environment, state).value
      )));
    }
    case 'object': {
      allocate(state);
      const object = Object.create(null) as Record<string, unknown>;
      for (const entry of expression.entries) {
        object[entry.key] = evaluateExpression(entry.value, environment, state).value;
      }
      return plain(object);
    }
    case 'construct': {
      const constructor = evaluateExpression(expression.constructor, environment, state);
      const args = expression.args.map((argument) => (
        evaluateExpression(argument, environment, state).value
      ));
      allocate(state);
      return plain(constructValue(constructor.capability, constructor.value, args));
    }
  }
};

const executeStatement = (
  statement: SafeStatement,
  environment: Environment,
  state: RuntimeState,
): Completion => {
  tick(state);
  switch (statement.kind) {
    case 'expression': return normal(evaluateExpression(statement.expression, environment, state));
    case 'declare': {
      const value = statement.value
        ? evaluateExpression(statement.value, environment, state)
        : plain(undefined);
      environment.declare(statement.name, value);
      return normal(value);
    }
    case 'return': return {
      type: 'return',
      value: statement.value
        ? evaluateExpression(statement.value, environment, state)
        : plain(undefined),
    };
    case 'throw': return {
      type: 'throw',
      value: evaluateExpression(statement.value, environment, state),
    };
    case 'if': {
      const branch = evaluateExpression(statement.test, environment, state).value
        ? statement.consequent
        : statement.alternate;
      return executeStatements(branch, new Environment(environment), state);
    }
    case 'while': {
      let result = normal();
      while (evaluateExpression(statement.test, environment, state).value) {
        tick(state);
        result = executeStatements(statement.body, new Environment(environment), state);
        if (result.type !== 'normal') return result;
      }
      return result;
    }
  }
};

function executeStatements(
  statements: SafeStatement[],
  environment: Environment,
  state: RuntimeState,
): Completion {
  let completion = normal();
  for (const statement of statements) {
    completion = executeStatement(statement, environment, state);
    if (completion.type !== 'normal') return completion;
  }
  return completion;
}

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
  const state: RuntimeState = {
    operations: policy.limits.operations,
    callDepth: 0,
    allocations: policy.limits.allocations,
    policy,
  };
  const completion = executeStatements(program.body, new Environment(), state);
  if (completion.type === 'throw') throw completion.value.value;
  return completion.value.value;
}
