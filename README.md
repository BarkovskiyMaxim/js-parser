# js-code-parser

`js-code-parser` parses, transforms, serializes, and interprets a legacy JavaScript subset without calling `eval` or `Function`.

## Compatibility API

```js
const { ReplaceVariableProcessor } =
  require('js-code-parser/executors/processor');

const output = new ReplaceVariableProcessor(
  ['Math', 'Object', 'window'],
  (name, known) => known ? name : `$context.$data.${name}`,
).process(source);
```

The CommonJS deep paths published by `0.0.1` remain supported.

## Build-time compiler API

The additive compiler API parses modern JavaScript, applies deterministic
preprocessors and AST transforms in order, and generates ordinary JavaScript:

```js
const {
  createReplaceVariablesTransform,
  transformSource,
} = require('js-code-parser');

const result = transformSource('const label = user?.name ?? "anonymous"', {
  sourceType: 'script',
  preprocessors: [(source) => source],
  transforms: [createReplaceVariablesTransform(
    ['Math'],
    (name, known) => known ? name : `$context.$data.${name}`,
  )],
});

result.ast;
result.diagnostics;
result.toString();
```

Use `sourceType: 'script'` for legacy functions and Knockout output, including
`with`. Use `sourceType: 'module'` for ESM; strict module syntax rejects
`with`. Supported opt-in syntax plugins are `jsx` and `typescript`.

Preprocessors receive strings and run before parsing. AST transforms run in
their declared order and may mutate the current program or return a replacement
program. None of these stages executes the input source.

## Strict execution API

`compile()` validates the final transformed program, lowers it to versioned
Safe IR, and executes it without ambient browser or Node.js globals:

```js
const { allowValue, compile } = require('js-code-parser');

const program = compile('Math.max(input, 0)', {
  policy: {
    globals: {
      Math: allowValue(Math, { call: ['max'] }),
      input: allowValue(0),
    },
    syntax: {
      functions: false,
      loops: false,
      classes: false,
      imports: false,
    },
    limits: {
      operations: 10_000,
      callDepth: 32,
      allocations: 1_000,
    },
  },
});

program.execute({ input: 4 }); // 4
program.ast;
program.ir;
```

For build artifacts, `program.toModule({ mode: 'plain' })` emits trusted plain
JavaScript. `program.toModule({ mode: 'instrumented' })` emits an ESM artifact
containing versioned Safe IR and importing `js-code-parser/runtime`; the caller
supplies capabilities when invoking its exported `execute(policy)` function.
Both modes avoid dynamic code generation, but only instrumented mode retains
runtime policy enforcement.

Policy is deny-by-default. Property `read`, `write`, method `call`, and direct
`construct` permissions are independent. Reflective keys such as
`constructor`, `prototype`, and `__proto__` are always denied. Execution
context can replace values only for capabilities already declared by policy;
it cannot add ambient globals.

Operation, call-depth, and allocation budgets stop interpreted code. An
explicitly allowed host method is trusted: synchronous JavaScript cannot be
preempted while execution is inside that host function, so only expose narrow,
bounded capabilities.

## Security boundary

The legacy evaluator and plain generated output are CSP-compatible because the
library does not introduce dynamic code generation. Plain output is still
ordinary JavaScript and is not a sandbox for hostile input. Strict
deny-by-default execution will be introduced through a separate additive API;
legacy behavior will not silently change.

See [Knockout AOT](docs/knockout-aot.md) and [Security Policy](SECURITY.md) for
deployment guidance and the supported threat boundary.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run verify:package
```
