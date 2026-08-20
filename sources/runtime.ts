export { SafeJavaScriptError } from './safe/errors';
export type {
  SafeJavaScriptErrorCode,
  SafeJavaScriptErrorMetadata,
  SourceRange,
} from './safe/errors';
export { executeProgram } from './safe/interpreter';
export {
  createInstrumentedModule,
  executeSerializedProgram,
} from './safe/module';
export type { InstrumentedModuleGenerationOptions } from './safe/module';
export { allowValue, normalizePolicy } from './safe/policy';
export type {
  AllowedValue,
  NormalizedSafePolicy,
  ResourceLimits,
  SafePolicy,
  SyntaxPolicy,
  ValuePermissions,
} from './safe/policy';
export type { SafeProgram } from './safe/ir';

