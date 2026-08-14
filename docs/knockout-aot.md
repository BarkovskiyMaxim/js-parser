# Knockout Ahead-of-Time Binding Compilation

The compatibility workflow converts Knockout binding expressions into ordinary
JavaScript during the application build. No binding source is evaluated in the
browser by this package.

```js
const ko = require('knockout');
const { ReplaceVariableProcessor } = require('js-code-parser/executors/processor');

const rewritten = ko.expressionRewriting.preProcessBindings(
  'text: title, visible: $root.ready, click: save',
  { valueAccessors: true },
);
const source = `function($context, $element) { return { ${rewritten} } }`;
const generated = new ReplaceVariableProcessor(
  ['Math', 'Object', 'window'],
  (name, known) => known ? name : `$context.$data.${name}`,
).process(source);
```

Insert `generated` into the existing bindings-cache build artifact. This is the
published `@devexpress/analytics-core-cli` compatibility contract and retains
the exact legacy formatter for syntax supported by version 0.0.1. Modern syntax
falls back to the maintained parser and generator.

The resulting code can run under `script-src 'self'` without `unsafe-eval` as
long as the surrounding application does not dynamically compile it. Treat
plain generated code as trusted build output, not as a sandbox. For dynamic
untrusted expressions, use `compile()` and the strict runtime policy instead.

