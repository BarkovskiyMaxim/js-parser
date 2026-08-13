import type { ModuleArtifact } from '../compiler/generator';
import { executeProgram } from './interpreter';
import type { SafeProgram } from './ir';
import { normalizePolicy, type SafePolicy } from './policy';

export interface InstrumentedModuleGenerationOptions {
  runtimeImport?: string;
}

const serializeForJavaScript = (value: unknown): string => (
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
);

export function executeSerializedProgram(
  ir: SafeProgram,
  policy: SafePolicy = {},
): unknown {
  return executeProgram(ir, normalizePolicy(policy));
}

export function createInstrumentedModule(
  ir: SafeProgram,
  options: InstrumentedModuleGenerationOptions = {},
): ModuleArtifact {
  const runtimeImport = options.runtimeImport ?? 'js-code-parser/runtime';
  const serializedIr = serializeForJavaScript(ir);
  const code = [
    `import { executeSerializedProgram } from ${JSON.stringify(runtimeImport)};`,
    `export const ir = ${serializedIr};`,
    'export const execute = (policy = {}) => executeSerializedProgram(ir, policy);',
  ].join('\n');
  return { code, map: null };
}
