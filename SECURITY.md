# Security Policy

## Supported security boundary

Use `compile()` with an explicit policy for untrusted input. The strict runtime
has no ambient browser or Node.js globals, validates the final transformed AST,
lowers reviewed syntax to versioned Safe IR, and checks actual receivers and
computed property keys during interpretation.

Capabilities are opaque runtime values created by `allowValue()`; raw
structural lookalikes are rejected when a policy is normalized. Permissions
for property reads, writes, method calls, direct calls, and construction are
independent. Reflective keys including `__proto__`, `prototype`, `constructor`,
`caller`, `callee`, and `arguments` are always denied. `globalThis`, `window`,
`self`, `process`, `require`, `module`, `eval`, and `Function` cannot be ambient
capabilities or values returned from allowed host operations.

Operation, call-depth, and allocation limits stop interpreted code with
`RESOURCE_LIMIT_EXCEEDED`. Safe IR with an unknown version is rejected.

## Boundaries and limitations

- `ReplaceVariableProcessor`, `Evaluator`, `execute`, and `_execute` are legacy
  compatibility APIs, not sandboxes for hostile code.
- Plain `toString()` and `toModule({ mode: 'plain' })` output is CSP-compatible
  ordinary JavaScript. It is not policy-enforced after loading.
- Instrumented modules serialize Safe IR and retain interpreter checks,
  including validation of declared per-execution context overrides.
- An explicitly allowed host method or constructor is trusted. Synchronous
  JavaScript cannot be preempted while executing inside that host function.
  Expose only narrow, bounded capabilities.
- Resource limits count runtime operations and allocations; they are not a
  byte-accurate process memory limit.

## Reporting vulnerabilities

Please report suspected vulnerabilities privately through GitHub Security
Advisories for this repository. Include a minimal source string, policy, runtime
environment, and observed error/result. Do not open a public issue before a fix
is available.
