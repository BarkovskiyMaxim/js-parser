# Safe JavaScript Modernization Roadmap

This roadmap splits the approved design into four independently reviewable implementation plans. A later phase starts only after the previous phase is green and its public interfaces are stable.

1. **Compatibility foundation and package contract** — modernize the test/build toolchain, preserve all legacy behavior, capture the real `@devexpress/analytics-core-cli` workflow, and verify the packed npm artifact.
2. **Standard parser and transform pipeline (complete)** — introduce the maintained parser, normalized AST, generator, ordered transforms, and the `ReplaceVariableProcessor` compatibility facade.
3. **Strict policy, Safe IR, and interpreter (complete)** — add deny-by-default policy types, validation, lowering, runtime enforcement, errors, and resource budgets for Node.js and browsers.
4. **AOT backends, browser CSP, and release hardening (complete)** — add plain and instrumented generation, cross-backend security conformance, ESM/browser exports, source maps, CSP tests, documentation, and release checks.

Detailed plan for phase 1: `docs/superpowers/plans/2026-08-13-compatibility-foundation.md`.

Detailed plan for phase 2: `docs/superpowers/plans/2026-08-13-standard-parser-transform-pipeline.md`.

Detailed plan for phase 3: `docs/superpowers/plans/2026-08-13-strict-policy-safe-ir-runtime.md`.

Detailed plan for phase 4: `docs/superpowers/plans/2026-08-13-aot-browser-release-hardening.md`.

Implementation runs in the isolated `codex/safe-js-modernization` branch. Each completed task is committed only after its verification checkpoint passes.
