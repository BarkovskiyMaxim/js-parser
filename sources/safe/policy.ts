export interface ValuePermissions {
  read?: readonly PropertyKey[];
  write?: readonly PropertyKey[];
  call?: readonly PropertyKey[];
  construct?: readonly PropertyKey[];
}

export interface NormalizedValuePermissions {
  readonly read: readonly PropertyKey[];
  readonly write: readonly PropertyKey[];
  readonly call: readonly PropertyKey[];
  readonly construct: readonly PropertyKey[];
}

export interface AllowedValue<T = unknown> {
  readonly value: T;
  readonly permissions: NormalizedValuePermissions;
}

export interface SyntaxPolicy {
  functions?: boolean;
  loops?: boolean;
  classes?: boolean;
  imports?: boolean;
}

export interface ResourceLimits {
  operations?: number;
  callDepth?: number;
  allocations?: number;
}

export interface SafePolicy {
  globals?: Readonly<Record<string, AllowedValue>>;
  syntax?: SyntaxPolicy;
  limits?: ResourceLimits;
}

export interface NormalizedSafePolicy {
  readonly globals: Readonly<Record<string, AllowedValue>>;
  readonly syntax: Required<SyntaxPolicy>;
  readonly limits: Required<ResourceLimits>;
}

const freezeKeys = (keys: readonly PropertyKey[] | undefined) => (
  Object.freeze([...(keys ?? [])])
);

export function allowValue<T>(
  value: T,
  permissions: ValuePermissions = {},
): AllowedValue<T> {
  if (value === globalThis) {
    throw new SafeJavaScriptError(
      'RUNTIME_POLICY_VIOLATION',
      'Raw global objects cannot be capabilities',
      { rule: 'capability.global-object' },
    );
  }
  return Object.freeze({
    value,
    permissions: Object.freeze({
      read: freezeKeys(permissions.read),
      write: freezeKeys(permissions.write),
      call: freezeKeys(permissions.call),
      construct: freezeKeys(permissions.construct),
    }),
  });
}

export function normalizePolicy(
  policy: SafePolicy = {},
): NormalizedSafePolicy {
  return Object.freeze({
    globals: Object.freeze({ ...(policy.globals ?? {}) }),
    syntax: Object.freeze({
      functions: policy.syntax?.functions ?? false,
      loops: policy.syntax?.loops ?? false,
      classes: policy.syntax?.classes ?? false,
      imports: policy.syntax?.imports ?? false,
    }),
    limits: Object.freeze({
      operations: policy.limits?.operations ?? 10_000,
      callDepth: policy.limits?.callDepth ?? 32,
      allocations: policy.limits?.allocations ?? 1_000,
    }),
  });
}
import { SafeJavaScriptError } from './errors';

