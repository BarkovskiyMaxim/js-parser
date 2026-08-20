import { rejectAmbientValue } from './runtime';
import { SafeJavaScriptError } from './errors';

export interface ValuePermissions {
  read?: readonly PropertyKey[];
  write?: readonly PropertyKey[];
  call?: boolean | readonly PropertyKey[];
  construct?: boolean;
}

export interface NormalizedValuePermissions {
  readonly read: readonly PropertyKey[];
  readonly write: readonly PropertyKey[];
  readonly call: boolean | readonly PropertyKey[];
  readonly construct: boolean;
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

const allowedValues = new WeakSet<object>();

const rejectInvalidCapability = (): never => {
  throw new SafeJavaScriptError(
    'RUNTIME_POLICY_VIOLATION',
    'Policy capability was not created by allowValue',
    { rule: 'capability.invalid' },
  );
};

export function allowValue<T>(
  value: T,
  permissions: ValuePermissions = {},
): AllowedValue<T> {
  rejectAmbientValue(value, 'capability.ambient');
  const capability = Object.freeze({
    value,
    permissions: Object.freeze({
      read: freezeKeys(permissions.read),
      write: freezeKeys(permissions.write),
      call: typeof permissions.call === 'boolean'
        ? permissions.call
        : freezeKeys(permissions.call),
      construct: permissions.construct ?? false,
      }),
  });
  allowedValues.add(capability);
  return capability;
}

export function normalizePolicy(
  policy: SafePolicy = {},
): NormalizedSafePolicy {
  const globals = { ...(policy.globals ?? {}) };
  for (const capability of Object.values(globals)) {
    if (!allowedValues.has(capability)) rejectInvalidCapability();
    rejectAmbientValue(capability.value, 'capability.ambient');
  }
  return Object.freeze({
    globals: Object.freeze(globals),
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

export function policyWithContext(
  policy: NormalizedSafePolicy,
  context: Readonly<Record<string, unknown>>,
): NormalizedSafePolicy {
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
}
