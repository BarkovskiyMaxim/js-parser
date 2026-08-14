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

## Security boundary

The legacy evaluator is CSP-compatible because it does not use dynamic code generation. It is not a sandbox for hostile input. Strict deny-by-default execution will be introduced through a separate additive API; legacy behavior will not silently change.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run verify:package
```
