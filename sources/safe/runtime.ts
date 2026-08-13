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

const permits = (
  capability: AllowedValue | undefined,
  operation: 'read' | 'write' | 'call' | 'construct',
  key: PropertyKey,
) => capability?.permissions[operation].includes(key) === true;

export function readProperty(
  capability: AllowedValue | undefined,
  receiver: unknown,
  key: PropertyKey,
): unknown {
  checkKey(key);
  if (!permits(capability, 'read', key)) deny('property.read');
  return Reflect.get(Object(receiver), key, receiver);
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
  return Reflect.apply(method, receiver, args);
}

