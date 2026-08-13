# Safe JavaScript Compiler and Runtime Design

## Status

Approved in conversation on 2026-08-13. This document describes the target architecture for modernizing `js-code-parser` while preserving compatibility with its published consumer, `@devexpress/analytics-core-cli`.

## Goals

The project will provide two related capabilities:

1. Compile and transform modern and legacy JavaScript during a build, then generate ordinary JavaScript that requires neither `eval` nor `Function` in the browser.
2. Execute dynamic JavaScript through a policy-controlled runtime in browsers and Node.js.

The implementation must preserve the published `js-code-parser@0.0.1` API and package paths used by existing consumers. New security guarantees are exposed through a new strict API; legacy behavior remains available through compatibility facades.

## Non-goals

- Reimplement every JavaScript semantic rule in the existing Jison grammar.
- Claim that generated native JavaScript is sandboxed unless it is emitted with policy instrumentation.
- Treat CSP compatibility alone as protection against malicious input.
- Add a general-purpose plugin API for changing the Babel parser grammar.
- Remove legacy exports or operand shapes in the first compatible release.

## Existing Consumer Contract

`@devexpress/analytics-core-cli@26.1.4` declares an exact dependency on `js-code-parser@0.0.1` and imports:

```js
const processor = require('js-code-parser/executors/processor')
  .ReplaceVariableProcessor;
```

It then calls:

```js
new processor(knownNames, replaceName).process(functionSource);
```

The compatibility contract therefore includes:

- CommonJS deep import `js-code-parser/executors/processor`;
- named export `ReplaceVariableProcessor`;
- the existing constructor arguments;
- `process(source: string): string`;
- semantically equivalent transformation of Knockout-generated functions;
- published `executors/*`, `parser/*`, and `operands/*` paths and declarations;
- existing `execute`, `_execute`, `Evaluator`, `Serializer`, parser, processor, and operand APIs.

Compatibility is defined by observable behavior, not by preserving the old internal implementation.

## Architecture

The library has a shared compiler frontend and two execution backends:

```text
JavaScript source
       |
       v
standard parser -> typed AST -> normalization -> ordered transforms
                                                 |
                                                 v
                                      policy validation
                                                 |
                                                 v
                                              Safe IR
                                              /     \
                                             /       \
                                  AOT generator     interpreter
                                       |                |
                                       v                v
                              JavaScript/module   controlled result
```

The same policy model and Safe IR semantics are used by build-time generation and runtime interpretation. Compatibility facades translate legacy calls and operand structures into the new internals where possible.

### Parser and normalized AST

A maintained standard JavaScript parser replaces the hand-maintained Jison grammar as the primary frontend. The parser must support current ECMAScript and the legacy syntax needed by the Knockout consumer, including `with` in script/non-strict parsing mode.

Parser configuration is explicit and split by input kind:

- `script` for legacy functions and Knockout output;
- `module` for ESM compilation;
- opt-in syntax plugins for supported proposals or typed syntax.

The public transform API uses a documented, typed normalized AST boundary. Parser-specific metadata may be retained internally for accurate source locations and generation.

### Transform pipeline

Compilation follows this fixed order:

```text
preprocess -> parse -> normalize -> transforms -> validate -> lower to Safe IR
```

- Preprocessors are optional string-to-string steps for syntax the standard parser cannot read. They must not execute input code.
- AST transforms run in declared order and are deterministic for the same inputs.
- Every transform receives a typed context with source metadata and diagnostics.
- The complete transformed program is validated again after the final transform.
- Source maps track generated output back to the original source when preprocessing supplies mappings.

The legacy `ReplaceVariableProcessor` becomes a compatibility facade over a built-in variable replacement transform and the generator. Its public constructor and `process()` method remain unchanged.

### Safe IR

Safe IR makes security-relevant behavior explicit. It distinguishes at least:

- lexical reads and writes;
- property reads and writes;
- calls and constructor calls;
- function creation and invocation;
- branches, loops, returns, and exceptions;
- object and array creation;
- module or host capability access;
- operation-budget checkpoints.

Safe IR is internal and versioned independently from the public package API. Serialized IR includes a format version and cannot be executed when the runtime does not support that version.

## Policy Model

The strict API is deny-by-default. With no policy, a program can only use explicitly classified safe literals and pure operators. It receives no ambient browser or Node.js globals.

Policy controls:

- accepted syntax categories;
- named globals and host capabilities;
- property reads;
- property writes;
- function and method calls;
- constructor calls;
- imports when compiling modules;
- operation count, call depth, and allocation-related limits.

Read, write, call, and construct permissions are independent. Allowing a value does not automatically allow access to all properties or methods reachable from it.

Dangerous reflective paths are always denied in strict mode, including:

- `__proto__`;
- `prototype`;
- `constructor`;
- `caller`;
- `callee`;
- `arguments` access that exposes caller state.

The runtime must prevent indirect access to `globalThis`, `window`, `self`, `process`, `require`, `module`, `eval`, and `Function` unless an API is deliberately represented by a narrower host capability. Providing the raw global object is not supported by the strict API.

Policy decisions are checked at two stages:

1. Compile time rejects syntax and statically identifiable operations that cannot be allowed.
2. Runtime checks the actual objects, keys, functions, and constructors involved in every security-sensitive operation.

This dual validation is necessary because many JavaScript values and property keys are only known at runtime.

### Resource limits

The interpreter decrements an operation budget at control-flow and invocation checkpoints. It also enforces call-depth and configurable allocation-related limits that can be measured by the runtime.

Exhausting a limit stops execution with a stable error. Synchronous JavaScript cannot be preempted while inside an allowed arbitrary host function, so host calls must be explicitly trusted. The documentation must state this limitation.

## Public APIs

### Strict API

The new API is additive. The initial public entry points are `compile` and `allowValue`; compilation returns a `CompiledProgram` with the behavior shown below:

```ts
const program = compile(source, {
  sourceType: 'script',
  transforms: [customTransform],
  policy: {
    globals: {
      Math: allowValue(Math, {
        read: ['PI'],
        call: ['max', 'min', 'round'],
      }),
    },
    syntax: {
      functions: true,
      loops: false,
      classes: false,
      imports: false,
    },
    limits: {
      operations: 10_000,
      callDepth: 32,
    },
  },
});

program.ast;
program.ir;
program.execute(context);
program.toString();
program.toModule();
```

`toString()` produces transformed JavaScript. `toModule()` produces an importable module artifact and optional source map. Output intended to retain strict runtime restrictions must use instrumented generation; plain generated JavaScript is only CSP-safe, not sandboxed.

### Legacy API

These interfaces remain supported with their current signatures and module paths:

- `ReplaceVariableProcessor`;
- `Serializer`;
- `Evaluator`;
- `execute` and `_execute`;
- `jsParser.parse()`;
- all published operand types and mapper functions.

Legacy settings such as `enabledWindowOperations` and `disabledOperations` retain their existing behavior. They may be adapted internally to policy primitives, but strict deny-by-default behavior must not silently alter legacy calls.

Security documentation must label the legacy evaluator as compatibility mode rather than a sandbox for untrusted code.

## AOT Generation

The build-time backend supports two output modes:

1. Plain transformed JavaScript for trusted build inputs and CSP-safe Knockout bindings.
2. Instrumented JavaScript that routes property access, calls, writes, constructors, and budget checkpoints through a policy runtime.

Plain output contains no `eval` or `Function` calls introduced by this library. Instrumented output also contains no dynamic code generation and preserves policy checks after it is loaded by the browser.

The Knockout workflow remains:

```text
template binding
 -> Knockout preProcessBindings
 -> function($context, $element) source
 -> ReplaceVariableProcessor
 -> generated addToBindingsCache call
 -> application bundle
```

Existing string escaping and output behavior used by this workflow are regression-tested.

## Browser and Node.js Support

The compiler and interpreter core do not read ambient environment globals. Host capabilities are passed explicitly.

Package output includes:

- CommonJS entries for the existing consumer and deep imports;
- ESM entries for new consumers;
- TypeScript declarations for both;
- browser-compatible modules without Node.js built-ins in runtime paths;
- explicit package exports that include every legacy published path.

The minimum Node.js version is 22. CI tests Node.js 22 and 24, the maintained LTS lines at design time. Browser support covers the latest two stable major versions of Chrome, Edge, Firefox, and Safari at release time; Internet Explorer is not supported. The browser bundle targets ES2022, and the compatibility test for the existing CLI runs in Node.js.

## Errors and Diagnostics

Errors are divided into stable categories:

- parse errors;
- transform errors;
- policy validation errors;
- runtime policy violations;
- resource limit violations;
- unsupported IR version errors.

Each library error provides:

- a stable machine-readable code;
- a concise message without dumping sensitive runtime values;
- source filename when supplied;
- source range when available;
- the policy rule or limit that was violated;
- an optional safe cause.

Legacy APIs preserve errors where consumers could depend on them. New error metadata is additive.

## Testing Strategy

### Legacy regression tests

The existing test suite remains and must pass without changing its expected semantics. Tests may be reorganized and spelling mistakes in descriptions may be corrected, but assertions that define behavior are retained.

### Consumer contract tests

A fixture derived from the published `@devexpress/analytics-core-cli` workflow verifies:

- `require('js-code-parser/executors/processor')` resolves from the packed package;
- `ReplaceVariableProcessor` is exported;
- its constructor and `process()` work unchanged;
- Knockout `preProcessBindings` output is transformed correctly;
- representative bindings for `$context`, `$data`, `$root`, `$parent`, `Math`, `Object`, and `window` match approved snapshots;
- generated cache code parses and loads without dynamic evaluation.

The fixture must not depend on an unpublished local import path.

### Security tests

Tests attempt direct and computed access to forbidden globals and reflective properties. They cover prototype-chain escapes, constructor recovery, aliased calls, getters, method receiver handling, writes, `new`, recursion, infinite loops, and operation-budget exhaustion.

Security tests run against both the interpreter and instrumented AOT output so both backends enforce equivalent rules.

### Cross-runtime and packaging tests

CI verifies:

- TypeScript type checking;
- unit and regression suites;
- Node.js execution;
- real-browser execution under a CSP without `unsafe-eval`;
- CommonJS and ESM imports;
- source maps;
- `npm pack` contents;
- installation and execution from the packed tarball;
- absence of accidental `eval` and `Function` use in browser runtime output.

## Documentation

README and API documentation will include:

- a minimal legacy compatibility example;
- strict compile and execute examples;
- policy recipes for common safe capabilities;
- a Knockout AOT example;
- CSP deployment guidance;
- the difference between plain AOT output and instrumented policy-enforced output;
- threat model, supported guarantees, and host-function limitations;
- migration guidance from `0.0.1`.

## Delivery Sequence

Implementation proceeds incrementally:

1. Capture the published package shape and consumer behavior in contract tests.
2. Modernize build, test, lint, packaging, and CI without changing behavior.
3. Introduce the maintained parser and normalized AST behind compatibility facades.
4. Reimplement variable replacement and serialization while keeping legacy tests green.
5. Add strict policy types, validation, and Safe IR.
6. Add the interpreter with runtime enforcement and resource budgets.
7. Add plain and instrumented AOT generation.
8. Add browser, security, package, and cross-backend conformance tests.
9. Complete documentation and release checks.

Each stage must leave the legacy consumer contract passing. Implementation is performed in the isolated `codex/safe-js-modernization` branch with small verified commits; this supersedes the earlier no-commit instruction.

## Acceptance Criteria

The modernization is complete when:

- all existing behavioral tests pass;
- the packed package supports the consumer's exact CommonJS deep import and processor call;
- representative `@devexpress/analytics-core-cli` binding generation remains equivalent;
- the strict interpreter runs in Node.js and a browser without dynamic evaluation;
- strict execution denies all capabilities that were not explicitly granted;
- compile-time and runtime policies reject tested escape techniques;
- operation and call-depth limits terminate controlled workloads;
- transformed source and importable modules can be generated with source maps;
- instrumented AOT output enforces the same policy scenarios as the interpreter;
- CI verifies CommonJS, ESM, browser CSP, security, and packed-artifact behavior;
- public documentation describes compatibility and security boundaries accurately.
