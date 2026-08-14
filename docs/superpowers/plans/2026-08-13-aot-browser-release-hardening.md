# AOT, Browser CSP, and Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the package with plain and policy-preserving AOT module artifacts, dual CommonJS/ESM exports, real-browser CSP verification, source maps, and reproducible release gates.

**Architecture:** Plain AOT serializes transformed trusted input and is CSP-compatible but not sandboxed. Instrumented AOT serializes versioned Safe IR into an ESM module that delegates execution to the same interpreter/runtime used by `compile()`, preserving runtime policy checks without dynamic code generation. Packaging keeps all legacy CommonJS locations while adding an ESM/browser entry for new consumers.

**Tech Stack:** TypeScript 5.9, Babel 7 generator, Vitest 4, esbuild, Playwright Core with installed Chrome/Edge executable, Node.js 22/24.

## Global Constraints

- Preserve every legacy CommonJS/deep-import API and exact Knockout processor output.
- Plain output is CSP-compatible only; never label it sandboxed.
- Instrumented output must route execution through Safe IR runtime gates and contain no `eval`, `Function`, or dynamically generated code.
- Browser runtime paths must import no Node.js built-ins.
- Source maps identify the supplied filename and original source.
- Package supports CommonJS `require` and ESM `import`; Node.js minimum remains 22.
- Real-browser verification applies CSP without `unsafe-eval`.
- Follow RED/GREEN TDD and commit each task independently.

---

### Task 1: Plain module artifacts and source maps

**Files:**
- Modify: `sources/compiler/generator.ts`
- Modify: `sources/compiler/transform.ts`
- Modify: `sources/safe/compile.ts`
- Create: `tests/compiler/module-artifact.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- `ModuleArtifact` exposes `{ code, map }`.
- `TransformSourceResult.toModule(options?)` produces plain ESM source and optional map.
- `CompiledProgram.toModule({ mode: 'plain', ...generatorOptions })` exposes the same trusted-output behavior.

- [ ] Write RED tests for an ESM artifact, source filename/content/mappings, and deterministic output.
- [ ] Implement plain module generation without executing input.
- [ ] Assert neither `eval` nor `Function` is introduced.
- [ ] Run full checks and commit `Add plain AOT module artifacts`.

### Task 2: Instrumented Safe IR modules

**Files:**
- Create: `sources/safe/module.ts`
- Modify: `sources/safe/compile.ts`
- Create: `tests/safe/instrumented-module.test.ts`
- Modify: `sources/index.ts`

**Interfaces:**
- `CompiledProgram.toModule({ mode: 'instrumented', runtimeImport? })` emits ESM containing serialized Safe IR and importing `executeSerializedProgram` from `js-code-parser/runtime` by default.
- `executeSerializedProgram(ir, policy?, context?)` validates the IR version, normalizes policy, applies declared context overrides, and invokes the existing interpreter.

- [ ] Write RED tests that import a generated module from a data URL, execute allowed literals/capabilities, and reject computed reflective keys.
- [ ] Implement deterministic IR serialization with escaping safe for JavaScript source.
- [ ] Assert generated code contains no `eval`, `Function`, or native source body.
- [ ] Run full checks and commit `Add instrumented Safe IR modules`.

### Task 3: Dual CommonJS and ESM package output

**Files:**
- Create: `tsconfig.esm.json`
- Create: `scripts/write-esm-package.mjs`
- Modify: `package.json`
- Modify: `scripts/clean.mjs`
- Modify: `scripts/verify-package.mjs`
- Modify: `tests/package/exports.test.ts`

**Interfaces:**
- Existing root/deep paths retain CommonJS `require` targets.
- Root `import` and `./runtime` resolve to browser-compatible ESM with declarations.
- `./runtime` exports only strict runtime types/functions required by instrumented modules.

- [ ] Add RED manifest and installed-tarball ESM import assertions.
- [ ] Add an ESM TypeScript build and nested `dist/esm/package.json` with `type: module`.
- [ ] Add conditional exports without moving legacy CJS files.
- [ ] Verify CJS and ESM consumers from the same tarball and commit `Publish dual CJS and ESM entries`.

### Task 4: Real browser CSP conformance

**Files:**
- Create: `scripts/verify-browser-csp.mjs`
- Create: `tests/browser/fixtures/csp.html`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- `npm run verify:browser` bundles a browser fixture, serves it on loopback, launches an installed Chromium-family browser, and fails on CSP violations, console errors, timeouts, or wrong results.
- CSP is `default-src 'none'; script-src 'self'; connect-src 'self'` with no `unsafe-eval`.

- [ ] Add a RED fixture that expects plain Knockout-style generated code and instrumented execution results under CSP.
- [ ] Implement browser bundling/server/launcher with deterministic cleanup and no external network.
- [ ] Add direct assertions that browser bundle/runtime files import no Node built-ins.
- [ ] Add CI execution and commit `Verify browser execution under strict CSP`.

### Task 5: Cross-backend policy conformance

**Files:**
- Create: `tests/safe/backend-conformance.test.ts`
- Modify: `sources/safe/module.ts`

**Interfaces:**
- The same Safe IR attack fixtures run through in-process interpreter and imported instrumented module, yielding the same result or stable error code/rule/limit.

- [ ] Add table-driven allowed arithmetic/capability cases and denied reflective/call/write/constructor/budget cases.
- [ ] Resolve only real semantic differences; do not weaken either backend.
- [ ] Run security and full suites and commit `Align interpreter and instrumented backends`.

### Task 6: Release documentation and gates

**Files:**
- Modify: `README.md`
- Create: `SECURITY.md`
- Create: `docs/knockout-aot.md`
- Create: `scripts/check-dynamic-code.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/superpowers/plans/2026-08-13-safe-js-modernization-roadmap.md`

**Interfaces:**
- `npm run verify` runs typecheck, lint, tests, package install checks, browser CSP checks, and scans shipped browser/runtime output for dynamic code generation.

- [ ] Document strict policy recipes, legacy compatibility warning, Knockout AOT, CSP deployment, error codes, limits, and trusted host-call boundary.
- [ ] Add dynamic-code scan over built runtime/browser entries and generated fixtures.
- [ ] Run fresh `npm ci` and complete `npm run verify`.
- [ ] Mark Phase 4 complete and commit `Harden safe JavaScript release pipeline`.

