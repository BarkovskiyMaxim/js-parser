import generate from '@babel/generator';
import type { GeneratorResult } from '@babel/generator';
import type { NormalizedProgram } from './ast';

export interface GenerateProgramOptions {
  compact?: boolean;
  filename?: string;
  sourceMaps?: boolean;
}

export interface GeneratedProgram {
  code: string;
  map: GeneratorResult['map'];
}

export function generateProgram(
  program: NormalizedProgram,
  options: GenerateProgramOptions = {},
): GeneratedProgram {
  const result = generate(program, {
    compact: options.compact ?? false,
    filename: options.filename,
    sourceMaps: options.sourceMaps ?? false,
  });

  return {
    code: result.code,
    map: result.map ?? null,
  };
}
