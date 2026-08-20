# Standard Parser and Transform Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a maintained JavaScript parser, typed AST transform pipeline, deterministic generator, and modern-syntax variable replacement while preserving every legacy API and exact output fixture.

**Architecture:** Babel supplies the maintained parser, typed AST, traversal, and generator. New `parseProgram`, `transformProgram`, `generateProgram`, and `transformSource` APIs form the compiler frontend. `ReplaceVariableProcessor` preserves the existing Jison implementation for all legacy inputs and falls back to the new scoped identifier transform only when the legacy parser cannot represent otherwise valid modern JavaScript.

**Tech Stack:** TypeScript 5.9, `@babel/parser`, `@babel/types`, `@babel/traverse`, `@babel/generator`, Vitest 4.

## Global Constraints

- Preserve `js-code-parser@0.0.1` CommonJS exports, deep imports, declarations, constructor signatures, and exact legacy serialization results.
- Support `script` parsing for legacy Knockout functions including `with`, and `module` parsing for ESM.
- Run preprocessors before parsing and AST transforms in declared order; no stage may execute source code.
- Keep policy validation, Safe IR, and execution out of this phase; those belong to Phase 3.
- Target ES2022 and Node.js 22 or newer; browser-facing compiler files must not import Node.js built-ins.
- Follow strict RED/GREEN TDD and commit after each independently verified task.

---

### Task 1: Maintained parser boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `sources/compiler/ast.ts`
- Create: `sources/compiler/parser.ts`
- Create: `tests/compiler/parser.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- Produces: `SourceType`, `SyntaxPlugin`, `NormalizedProgram`, `ParseProgramOptions`, and `parseProgram(source, options)`.
- `parseProgram` returns a Babel `Program` normalized to an explicit source type while hiding the parser `File` wrapper.

- [ ] **Step 1: Write failing parser tests**

```ts
expect(parseProgram('with (ctx) { value }', { sourceType: 'script' }).sourceType)
  .toBe('script');
expect(parseProgram('export const value = input?.value ?? 0', {
  sourceType: 'module',
}).body[0].type).toBe('ExportNamedDeclaration');
expect(() => parseProgram('with (ctx) {}', { sourceType: 'module' }))
  .toThrow();
```

- [ ] **Step 2: Run `npm test -- tests/compiler/parser.test.ts` and verify failure because `parseProgram` does not exist.**
- [ ] **Step 3: Install the four Babel packages and implement the minimal typed parser wrapper with explicit `script`/`module` mode and allowlisted `jsx` and `typescript` syntax plugins.**
- [ ] **Step 4: Export the new parser types and function from `sources/index.ts`.**
- [ ] **Step 5: Run the focused test, then `npm run typecheck`, `npm run lint`, and `npm test`; expect all tests green.**
- [ ] **Step 6: Commit with message `Add maintained JavaScript parser API`.**

### Task 2: Ordered preprocessing and AST transforms

**Files:**
- Create: `sources/compiler/transform.ts`
- Create: `tests/compiler/transform.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- Produces: `Diagnostic`, `Preprocessor`, `TransformContext`, `ProgramTransform`, `TransformSourceOptions`, `TransformSourceResult`, `transformProgram(program, transforms, context)`, and `transformSource(source, options)`.
- A preprocessor has signature `(source: string, context: Readonly<SourceContext>) => string`.
- A program transform has signature `(program: NormalizedProgram, context: TransformContext) => NormalizedProgram | void`.

- [ ] **Step 1: Write a failing test whose preprocessor records `preprocess`, whose two transforms record `first` and `second`, and whose assertion expects that exact order plus the transformed AST.**
- [ ] **Step 2: Run the focused test and verify failure because `transformSource` is missing.**
- [ ] **Step 3: Implement preprocessing, one parse, ordered transforms, a shared diagnostics array, and the rule that `void` means in-place mutation while a returned program replaces the current program.**
- [ ] **Step 4: Add a failing test proving repeated calls with the same pure stages produce structurally equal ASTs without retaining diagnostics from the previous call.**
- [ ] **Step 5: Implement per-call context isolation and rerun focused and full verification.**
- [ ] **Step 6: Commit with message `Add ordered JavaScript transform pipeline`.**

### Task 3: Deterministic JavaScript generation

**Files:**
- Create: `sources/compiler/generator.ts`
- Modify: `sources/compiler/transform.ts`
- Create: `tests/compiler/generator.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- Produces: `GenerateProgramOptions`, `GeneratedProgram`, and `generateProgram(program, options)`.
- Extends `TransformSourceResult` with `toString(options?)`, returning deterministic JavaScript without source execution.

- [ ] **Step 1: Write a failing test that parses `const answer = input?.value ?? 42`, generates it twice, and expects the literal `const answer = input?.value ?? 42;` both times.**
- [ ] **Step 2: Run the focused test and verify failure because `generateProgram` is missing.**
- [ ] **Step 3: Implement generation through Babel with stable defaults, optional compact output, filename propagation, and optional source maps.**
- [ ] **Step 4: Add a test asserting generated output contains neither `eval(` nor `Function(` when the input contains neither construct.**
- [ ] **Step 5: Run focused tests, typecheck, lint, all tests, and package verification.**
- [ ] **Step 6: Commit with message `Add deterministic JavaScript generator`.**

### Task 4: Scoped variable replacement transform

**Files:**
- Create: `sources/compiler/transforms/replace-variables.ts`
- Create: `tests/compiler/replace-variables.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- Produces: `createReplaceVariablesTransform(knownNames, replaceName): ProgramTransform`.
- `replaceName` retains the legacy signature `(variableName: string, existsInFunctionArgs: boolean) => string`.
- Replacement strings are parsed as expressions, allowing results such as `$context.$data.title`.

- [ ] **Step 1: Write a failing test transforming `function run(local) { const nested = local; return external + nested; }` and expect only `external` to become `scope.external`; capture callback flags as `[['external', false]]`.**
- [ ] **Step 2: Run the focused test and verify failure because the transform factory is missing.**
- [ ] **Step 3: Implement Babel traversal that replaces referenced identifiers only, skips property keys and non-computed member names, respects lexical bindings, and parses callback output as an expression.**
- [ ] **Step 4: Add RED tests for optional chaining, computed keys, shorthand properties, nested function parameters, and known names; implement each case minimally and verify GREEN after each.**
- [ ] **Step 5: Run focused and full verification.**
- [ ] **Step 6: Commit with message `Add scoped variable replacement transform`.**

### Task 5: Compatibility facade with modern fallback

**Files:**
- Modify: `sources/executors/processor.ts`
- Create: `tests/consumer/modern-processor.test.ts`
- Modify: `README.md`

**Interfaces:**
- Preserves: `new ReplaceVariableProcessor(functionArgs?, replaceName?).process(source): string`.
- Uses the untouched legacy parser/serializer path when it succeeds; uses `transformSource`, `createReplaceVariablesTransform`, and compact generation only after a legacy parse failure.

- [ ] **Step 1: Add a failing consumer test processing a function with optional chaining and nullish coalescing; expect a parseable result containing `$context.$data.user?.name ?? 'anonymous'`.**
- [ ] **Step 2: Run the focused test and verify the legacy parser rejects the modern syntax.**
- [ ] **Step 3: Extract the current implementation into a private `processLegacy` path and add the modern parser fallback without changing the public class shape.**
- [ ] **Step 4: Run the unchanged 77-test suite and verify every exact legacy snapshot remains identical, then run the new consumer test.**
- [ ] **Step 5: Document new compiler APIs, explicit source types, transform ordering, and the fact that transformation/generation is CSP-compatible but not a sandbox.**
- [ ] **Step 6: Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run verify:package`; expect all green.**
- [ ] **Step 7: Commit with message `Support modern syntax through processor facade`.**

### Task 6: Phase 2 package and CI contract

**Files:**
- Modify: `tests/package/exports.test.ts`
- Modify: `scripts/verify-package.mjs`
- Modify: `docs/superpowers/plans/2026-08-13-safe-js-modernization-roadmap.md`

**Interfaces:**
- Verifies root CommonJS access to the new compiler API and unchanged deep imports from the packed artifact.

- [ ] **Step 1: Add failing packed-consumer assertions for `parseProgram`, `transformSource`, `generateProgram`, and `createReplaceVariablesTransform`.**
- [ ] **Step 2: Run package verification and confirm the new assertions fail against the pre-build package shape for the expected reason.**
- [ ] **Step 3: Adjust build/package configuration only if required for the compiler files to ship; do not add a new public deep-import path in this phase.**
- [ ] **Step 4: Run the complete verification sequence: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run verify:package`, and `git diff --check`.**
- [ ] **Step 5: Mark Phase 2 complete in the roadmap and commit with message `Verify modern compiler package contract`.**

