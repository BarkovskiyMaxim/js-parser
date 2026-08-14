import type { SourceRange } from './errors';

export interface SafeNode {
  range?: SourceRange;
}

export interface SafeProgram extends SafeNode {
  version: 1;
  body: SafeStatement[];
}

export type SafeStatement =
  | (SafeNode & { kind: 'declare'; name: string; value?: SafeExpression })
  | (SafeNode & { kind: 'expression'; expression: SafeExpression })
  | (SafeNode & { kind: 'if'; test: SafeExpression; consequent: SafeStatement[]; alternate: SafeStatement[] })
  | (SafeNode & { kind: 'while'; test: SafeExpression; body: SafeStatement[] })
  | (SafeNode & { kind: 'return'; value?: SafeExpression })
  | (SafeNode & { kind: 'throw'; value: SafeExpression });

export type SafeExpression =
  | (SafeNode & { kind: 'literal'; value: string | number | boolean | null | undefined })
  | (SafeNode & { kind: 'readVariable'; name: string })
  | (SafeNode & { kind: 'readProperty'; object: SafeExpression; key: SafeExpression })
  | (SafeNode & { kind: 'writeVariable'; name: string; value: SafeExpression })
  | (SafeNode & { kind: 'writeProperty'; object: SafeExpression; key: SafeExpression; value: SafeExpression })
  | (SafeNode & { kind: 'binary'; operator: string; left: SafeExpression; right: SafeExpression })
  | (SafeNode & { kind: 'unary'; operator: string; argument: SafeExpression })
  | (SafeNode & { kind: 'call'; callee?: SafeExpression; receiver?: SafeExpression; key?: SafeExpression; args: SafeExpression[] })
  | (SafeNode & { kind: 'construct'; constructor: SafeExpression; args: SafeExpression[] })
  | (SafeNode & { kind: 'function'; name?: string; params: string[]; body: SafeStatement[] })
  | (SafeNode & { kind: 'array'; values: SafeExpression[] })
  | (SafeNode & { kind: 'object'; entries: Array<{ key: string; value: SafeExpression }> });

