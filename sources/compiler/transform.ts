import type { NormalizedProgram } from './ast';
import {
  generateProgram,
  type GenerateProgramOptions,
} from './generator';
import {
  parseProgram,
  type ParseProgramOptions,
} from './parser';

export interface SourceContext {
  filename?: string;
}

export interface Diagnostic {
  code: string;
  message: string;
}

export type Preprocessor = (
  source: string,
  context: Readonly<SourceContext>,
) => string;

export interface TransformContext extends SourceContext {
  diagnostics: Diagnostic[];
}

export type ProgramTransform = (
  program: NormalizedProgram,
  context: TransformContext,
) => NormalizedProgram | void;

export interface TransformSourceOptions extends ParseProgramOptions {
  preprocessors?: readonly Preprocessor[];
  transforms?: readonly ProgramTransform[];
}

export interface TransformSourceResult {
  ast: NormalizedProgram;
  diagnostics: readonly Diagnostic[];
  toString(options?: GenerateProgramOptions): string;
}

export function transformProgram(
  program: NormalizedProgram,
  transforms: readonly ProgramTransform[],
  context: TransformContext,
): NormalizedProgram {
  let current = program;
  for (const transform of transforms) {
    current = transform(current, context) ?? current;
  }
  return current;
}

export function transformSource(
  source: string,
  options: TransformSourceOptions,
): TransformSourceResult {
  const sourceContext: Readonly<SourceContext> = {
    filename: options.filename,
  };
  let processedSource = source;
  for (const preprocess of options.preprocessors ?? []) {
    processedSource = preprocess(processedSource, sourceContext);
  }

  const context: TransformContext = {
    ...sourceContext,
    diagnostics: [],
  };
  const ast = transformProgram(
    parseProgram(processedSource, options),
    options.transforms ?? [],
    context,
  );

  return {
    ast,
    diagnostics: [...context.diagnostics],
    toString: (generateOptions) => generateProgram(ast, {
      filename: options.filename,
      ...generateOptions,
    }).code,
  };
}
