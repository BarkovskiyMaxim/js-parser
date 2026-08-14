import type { NormalizedProgram } from '../compiler/ast';
import type { GenerateProgramOptions } from '../compiler/generator';
import {
  transformSource,
  type Diagnostic,
  type TransformSourceOptions,
} from '../compiler/transform';
import { SafeJavaScriptError } from './errors';
import { executeProgram } from './interpreter';
import type { SafeProgram } from './ir';
import { lowerProgram } from './lower';
import {
  allowValue,
  normalizePolicy,
  type NormalizedSafePolicy,
  type SafePolicy,
} from './policy';
import { validateProgram } from './validate';

export interface CompileOptions extends TransformSourceOptions {
  policy?: SafePolicy;
}

export interface CompiledProgram {
  readonly ast: NormalizedProgram;
  readonly ir: SafeProgram;
  readonly diagnostics: readonly Diagnostic[];
  execute(context?: Readonly<Record<string, unknown>>): unknown;
  toString(options?: GenerateProgramOptions): string;
}

const policyWithContext = (
  policy: NormalizedSafePolicy,
  context: Readonly<Record<string, unknown>>,
): NormalizedSafePolicy => {
  const globals = { ...policy.globals };
  for (const [name, value] of Object.entries(context)) {
    const capability = globals[name];
    if (!capability) {
      throw new SafeJavaScriptError(
        'RUNTIME_POLICY_VIOLATION',
        'Execution context contains an undeclared capability',
        { rule: 'context.global' },
      );
    }
    globals[name] = allowValue(value, capability.permissions);
  }
  return normalizePolicy({
    globals,
    syntax: policy.syntax,
    limits: policy.limits,
  });
};

export function compile(
  source: string,
  options: Partial<CompileOptions> = {},
): CompiledProgram {
  const transformed = transformSource(source, {
    sourceType: options.sourceType ?? 'script',
    filename: options.filename,
    syntax: options.syntax,
    preprocessors: options.preprocessors,
    transforms: options.transforms,
  });
  const policy = normalizePolicy(options.policy);
  validateProgram(transformed.ast, policy, { filename: options.filename });
  const ir = lowerProgram(transformed.ast);

  return Object.freeze({
    ast: transformed.ast,
    ir,
    diagnostics: transformed.diagnostics,
    execute: (context: Readonly<Record<string, unknown>> = {}) => (
      executeProgram(ir, policyWithContext(policy, context))
    ),
    toString: transformed.toString,
  });
}

