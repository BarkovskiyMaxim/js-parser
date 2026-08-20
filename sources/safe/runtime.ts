import { SafeJavaScriptError } from './errors';
import type { AllowedValue } from './policy';

const reflectiveKeys = new Set<PropertyKey>([
  '__proto__',
  'prototype',
  'constructor',
  'caller',
  'callee',
  'arguments',
]);

const ambientValues = new Set<unknown>([
  globalThis,
  globalThis.Function,
  globalThis.eval,
  Reflect.get(globalThis, 'window'),
  Reflect.get(globalThis, 'self'),
  Reflect.get(globalThis, 'process'),
].filter((value) => value !== undefined));

const deny = (rule: string): never => {
  throw new SafeJavaScriptError(
    'RUNTIME_POLICY_VIOLATION',
    'Runtime operation was denied',
    { rule },
  );
};

const checkKey = (key: PropertyKey) => {
  if (reflectiveKeys.has(key)) deny('property.reflective');
};

export function rejectAmbientValue(value: unknown, rule: string): void {
  if (ambientValues.has(value)) deny(rule);
}

const permits = (
  capability: AllowedValue | undefined,
  operation: 'read' | 'write' | 'call',
  key: PropertyKey,
) => {
  const permission = capability?.permissions[operation];
  return Array.isArray(permission) && permission.includes(key);
};

export function callValue(
  capability: AllowedValue | undefined,
  callable: unknown,
  args: unknown[],
): unknown {
  if (capability?.permissions.call !== true) deny('value.call');
  if (typeof callable !== 'function') deny('value.call');
  const value = Reflect.apply(
    callable as (...callArgs: unknown[]) => unknown,
    undefined,
    args,
  );
  rejectAmbientValue(value, 'capability.ambient-result');
  return value;
}

export function readProperty(
  capability: AllowedValue | undefined,
  receiver: unknown,
  key: PropertyKey,
): unknown {
  checkKey(key);
  if (!permits(capability, 'read', key)) deny('property.read');
  const value = Reflect.get(Object(receiver), key, receiver);
  rejectAmbientValue(value, 'capability.ambient-result');
  return value;
}

export function readOwnedProperty(
  receiver: unknown,
  key: PropertyKey,
): unknown {
  checkKey(key);
  const value = Reflect.get(Object(receiver), key, receiver);
  rejectAmbientValue(value, 'capability.ambient-result');
  return value;
}

export function constructValue(
  capability: AllowedValue | undefined,
  constructor: unknown,
  args: unknown[],
): unknown {
  if (capability?.permissions.construct !== true) deny('value.construct');
  if (typeof constructor !== 'function') deny('value.construct');
  const value = Reflect.construct(constructor as Function, args);
  rejectAmbientValue(value, 'capability.ambient-result');
  return value;
}

export function writeProperty(
  capability: AllowedValue | undefined,
  receiver: unknown,
  key: PropertyKey,
  value: unknown,
): unknown {
  checkKey(key);
  if (!permits(capability, 'write', key)) deny('property.write');
  if (!Reflect.set(Object(receiver), key, value, receiver)) {
    deny('property.write');
  }
  return value;
}

export function writeOwnedProperty(
  receiver: unknown,
  key: PropertyKey,
  value: unknown,
): unknown {
  checkKey(key);
  if (!Reflect.set(Object(receiver), key, value, receiver)) {
    deny('property.write');
  }
  return value;
}

export function callProperty(
  capability: AllowedValue | undefined,
  receiver: unknown,
  key: PropertyKey,
  args: unknown[],
): unknown {
  checkKey(key);
  if (!permits(capability, 'call', key)) deny('property.call');
  const method = Reflect.get(Object(receiver), key, receiver);
  if (typeof method !== 'function') deny('property.call');
  const value = Reflect.apply(method, receiver, args);
  rejectAmbientValue(value, 'capability.ambient-result');
  return value;
}
