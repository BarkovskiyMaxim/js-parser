import generate from '@babel/generator';
import type { GeneratorResult } from '@babel/generator';
import type { NormalizedProgram } from './ast';

export interface GenerateProgramOptions {
  compact?: boolean;
  filename?: string;
  sourceMaps?: boolean;
  source?: string;
}

export interface ModuleArtifact {
  code: string;
  map: GeneratorResult['map'];
}

export type GeneratedProgram = ModuleArtifact;

export function generateProgram(
  program: NormalizedProgram,
  options: GenerateProgramOptions = {},
): GeneratedProgram {
  const result = generate(program, {
    compact: options.compact ?? false,
    filename: options.filename,
    sourceFileName: options.source === undefined ? undefined : options.filename,
    sourceMaps: options.sourceMaps ?? false,
  }, options.source);

  return {
    code: result.code,
    map: result.map ?? null,
  };
}
