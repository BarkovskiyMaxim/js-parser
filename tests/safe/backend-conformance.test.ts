import { afterEach, describe, expect, test } from 'vitest';
import { compile } from '../../sources/safe/compile';
import { SafeJavaScriptError } from '../../sources/safe/errors';
import { executeSerializedProgram } from '../../sources/safe/module';
import { allowValue, type SafePolicy } from '../../sources/safe/policy';

const dataUrl = (source: string) => (
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

const outcome = (run: () => unknown) => {
  try {
    return { status: 'fulfilled', value: run() } as const;
  } catch (error) {
    if (!(error instanceof SafeJavaScriptError)) throw error;
    return {
      status: 'rejected',
      code: error.code,
      rule: error.rule,
      limit: error.limit,
    } as const;
  }
};

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__backendRuntime;
});

describe('interpreter and instrumented module conformance', () => {
  const cases: Array<{ name: string; source: string; policy: SafePolicy }> = [
    {
      name: 'pure arithmetic',
      source: '1 + 2 * 3;',
      policy: {},
    },
    {
      name: 'allowed method',
      source: 'Math.max(1, 4);',
      policy: { globals: { Math: allowValue(Math, { call: ['max'] }) } },
    },
    {
      name: 'computed reflective read',
      source: 'host[key];',
      policy: {
        globals: {
          host: allowValue({}, { read: ['constructor'] }),
          key: allowValue('constructor'),
        },
      },
    },
    {
      name: 'denied method call',
      source: 'host.run();',
      policy: { globals: { host: allowValue({ run: () => 1 }) } },
    },
    {
      name: 'denied property write',
      source: 'host.value = 2;',
      policy: { globals: { host: allowValue({ value: 1 }) } },
    },
    {
      name: 'operation exhaustion',
      source: 'while (true) {}',
      policy: { syntax: { loops: true }, limits: { operations: 10 } },
    },
  ];

  test.each(cases)('$name', async ({
    source,
    policy,
  }) => {
    const program = compile(source, { policy });
    const direct = outcome(() => program.execute());

    (globalThis as Record<string, unknown>).__backendRuntime = executeSerializedProgram;
    const runtimeImport = dataUrl(`
      export const executeSerializedProgram = (...args) =>
        globalThis.__backendRuntime(...args);
    `);
    const artifact = program.toModule({ mode: 'instrumented', runtimeImport });
    const generated = await import(`${dataUrl(artifact.code)}#${encodeURIComponent(source)}`);
    const instrumented = outcome(() => generated.execute(policy));

    expect(instrumented).toEqual(direct);
  });
});
