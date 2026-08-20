export type SafeJavaScriptErrorCode =
  | 'PARSE_UNSUPPORTED_SYNTAX'
  | 'POLICY_SYNTAX_DENIED'
  | 'POLICY_GLOBAL_DENIED'
  | 'POLICY_REFLECTIVE_ACCESS'
  | 'RUNTIME_POLICY_VIOLATION'
  | 'RESOURCE_LIMIT_EXCEEDED'
  | 'UNSUPPORTED_IR_VERSION';

export interface SourceRange {
  start: number;
  end: number;
}

export interface SafeJavaScriptErrorMetadata {
  filename?: string;
  range?: SourceRange;
  rule?: string;
  limit?: string;
  cause?: unknown;
}

export class SafeJavaScriptError extends Error {
  readonly code: SafeJavaScriptErrorCode;
  readonly filename?: string;
  readonly range?: SourceRange;
  readonly rule?: string;
  readonly limit?: string;
  declare readonly cause?: unknown;

  constructor(
    code: SafeJavaScriptErrorCode,
    message: string,
    metadata: SafeJavaScriptErrorMetadata = {},
  ) {
    super(message);
    this.name = 'SafeJavaScriptError';
    this.code = code;
    this.filename = metadata.filename;
    this.range = metadata.range;
    this.rule = metadata.rule;
    this.limit = metadata.limit;
    Object.defineProperty(this, 'cause', {
      configurable: true,
      enumerable: false,
      value: metadata.cause,
      writable: false,
    });
  }
}

