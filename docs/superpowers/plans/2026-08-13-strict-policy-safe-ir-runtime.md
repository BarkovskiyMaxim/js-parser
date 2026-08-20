# Strict Policy, Safe IR, and Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an additive deny-by-default `compile()` API that validates source, lowers it to versioned Safe IR, and executes it in browsers or Node.js through explicit capabilities and resource limits.

**Architecture:** Compilation reuses the Phase 2 transform pipeline, validates the final Babel AST, and lowers only the reviewed syntax subset into internal Safe IR. The interpreter never resolves ambient globals and routes every property read/write, call, and construction through runtime policy gates. Plain generation remains a separate build-time feature and is not described as sandboxed.

**Tech Stack:** TypeScript 5.9, Babel 7 AST, Vitest 4, browser-compatible ES2022 runtime without Node.js imports.

## Global Constraints

- Strict mode is deny-by-default; no ambient `globalThis`, `window`, `self`, `process`, `require`, `module`, `eval`, or `Function`.
- Always deny `__proto__`, `prototype`, `constructor`, `caller`, `callee`, and `arguments` reflective access.
- Read, write, call, and construct permissions are independent and checked using the actual runtime receiver/key/value.
- Compile-time validation runs after all transforms; runtime gates remain mandatory for computed values.
- Enforce operation and call-depth limits with stable machine-readable errors.
- Do not claim preemption while inside an explicitly allowed host function.
- Preserve all Phase 1/2 exports, exact legacy processor strings, and packed consumer behavior.
- Follow RED/GREEN TDD and commit each task independently.

---

### Task 1: Stable errors and policy normalization

**Files:**
- Create: `sources/safe/errors.ts`
- Create: `sources/safe/policy.ts`
- Create: `tests/safe/policy.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- `SafeJavaScriptError` exposes `code`, `filename`, `range`, `rule`, `limit`, and safe `cause` metadata.
- `allowValue(value, permissions)` returns an opaque capability; permissions contain independent `read`, `write`, `call`, and `construct` key allowlists.
- `normalizePolicy(policy?)` supplies false syntax flags and finite default limits without adding globals.

- [ ] Write RED tests proving an empty policy has no globals, capability permission arrays are copied/frozen, and stable errors do not stringify runtime values.
- [ ] Implement `SafeJavaScriptError`, policy types, `allowValue`, and normalization.
- [ ] Run focused test, typecheck, lint, and all tests.
- [ ] Commit `Add strict policy primitives`.

### Task 2: Post-transform policy validation

**Files:**
- Create: `sources/safe/validate.ts`
- Create: `tests/safe/validation.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- `validateProgram(program, policy, sourceContext)` returns void or throws `SafeJavaScriptError` with `PARSE_UNSUPPORTED_SYNTAX`, `POLICY_SYNTAX_DENIED`, `POLICY_GLOBAL_DENIED`, or `POLICY_REFLECTIVE_ACCESS`.
- Initial reviewed syntax: literals, local declarations, expressions, objects/arrays, functions, branches, loops, return, throw, property access, calls, and `new`; classes/imports remain rejected unless a later lowering task implements them.

- [ ] Write RED table tests for forbidden ambient globals and direct/computed reflective keys.
- [ ] Implement referenced-identifier validation against lexical bindings and explicit policy globals.
- [ ] Write RED tests for functions/loops/constructors controlled independently by syntax policy and implement syntax gates.
- [ ] Verify validation occurs against a manually transformed AST.
- [ ] Run full checks and commit `Validate strict JavaScript policies`.

### Task 3: Versioned Safe IR lowering

**Files:**
- Create: `sources/safe/ir.ts`
- Create: `sources/safe/lower.ts`
- Create: `tests/safe/lower.test.ts`

**Interfaces:**
- `SafeProgram` has `version: 1`, explicit statements/expressions, and source ranges.
- IR distinguishes variable/property reads and writes, calls, constructor calls, functions, branches, loops, returns, throws, and allocation checkpoints.
- `lowerProgram(program)` rejects unimplemented nodes with `PARSE_UNSUPPORTED_SYNTAX`.

- [ ] Write RED literal fixtures for arithmetic, computed property read/write, method call receiver, function/branch/loop, and constructor IR.
- [ ] Implement lowering one fixture at a time without executing source.
- [ ] Add RED unsupported-node and IR-version tests.
- [ ] Run full checks and commit `Lower validated programs to Safe IR`.

### Task 4: Runtime capability gates and expression interpreter

**Files:**
- Create: `sources/safe/runtime.ts`
- Create: `sources/safe/interpreter.ts`
- Create: `tests/safe/runtime-security.test.ts`

**Interfaces:**
- `executeProgram(ir, policy, context?)` returns the program result.
- Runtime gates implement `readProperty`, `writeProperty`, `callValue`, and `constructValue` and throw `RUNTIME_POLICY_VIOLATION` with a rule name.
- Method calls preserve the reviewed receiver; getters are invoked only after read permission succeeds.

- [ ] Write RED tests for literal/pure operator execution with no globals.
- [ ] Add RED tests proving reads do not imply calls/writes/constructors.
- [ ] Add RED escape tests for computed `constructor`, prototype-chain access, aliased methods, getters, and raw global objects.
- [ ] Implement capability identity tracking, reflective-key denial, expression evaluation, and receiver-safe calls.
- [ ] Run full checks and commit `Enforce runtime capability policies`.

### Task 5: Statements, closures, and resource budgets

**Files:**
- Modify: `sources/safe/interpreter.ts`
- Create: `tests/safe/interpreter.test.ts`
- Create: `tests/safe/resource-limits.test.ts`

**Interfaces:**
- Interpreter supports lexical scopes, declarations, assignment, branches, loops, returns, throws, closures, and explicitly allowed constructors.
- Every IR node/control-flow edge consumes operations; function calls enforce `callDepth`; object/array/function creation consumes allocations.

- [ ] Write RED behavior tests for lexical scope, closure capture, `this` receiver, branching, and finite loops.
- [ ] Implement statements and completion records minimally.
- [ ] Write RED tests for infinite loops, recursion, and allocation exhaustion with exact stable codes/limit names.
- [ ] Implement deterministic counters and verify allowed host calls are documented as trusted/non-preemptible.
- [ ] Run full checks and commit `Add controlled Safe IR interpreter`.

### Task 6: Public compile contract

**Files:**
- Create: `sources/safe/compile.ts`
- Create: `tests/safe/compile.test.ts`
- Modify: `sources/index.ts`
- Modify: `README.md`

**Interfaces:**
- `compile(source, options?)` returns `{ ast, ir, diagnostics, execute(context?), toString(options?) }`.
- Pipeline order is `preprocess -> parse -> normalize -> transforms -> validate -> lower`.
- `execute` uses only policy capabilities and local context values explicitly declared by policy; `toString` remains plain CSP-compatible output, not sandboxed output.

- [ ] Write RED end-to-end tests for default literal execution, denied globals, allowed `Math.max`, transform-then-validation, and browser-like operation with Node globals absent.
- [ ] Implement the orchestration without duplicating parser/transform/generator logic.
- [ ] Add API documentation with strict examples and the host-call preemption limitation.
- [ ] Run full checks and commit `Expose strict compile and execute API`.

### Task 7: Cross-layer security and packed contract

**Files:**
- Create: `tests/safe/security-conformance.test.ts`
- Modify: `scripts/verify-package.mjs`
- Modify: `docs/superpowers/plans/2026-08-13-safe-js-modernization-roadmap.md`

**Interfaces:**
- Packed CommonJS root exposes `compile`, `allowValue`, and stable error classes while all legacy paths continue to resolve.

- [ ] Add table-driven attacks for direct/computed globals, constructor recovery, prototype access, getters, writes, calls, `new`, recursion, and infinite loops.
- [ ] Run the same applicable cases through compile-time and runtime boundaries and assert stable error categories.
- [ ] Extend the installed-tarball consumer to execute one denied program and one allowed capability program.
- [ ] Run fresh `npm ci`, typecheck, lint, all tests, package verification, and `git diff --check`.
- [ ] Mark Phase 3 complete and commit `Verify strict runtime security contract`.

