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

## Security boundary

The legacy evaluator and plain generated output are CSP-compatible because the
library does not introduce dynamic code generation. Plain output is still
ordinary JavaScript and is not a sandbox for hostile input. Strict
deny-by-default execution will be introduced through a separate additive API;
legacy behavior will not silently change.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run verify:package
```
