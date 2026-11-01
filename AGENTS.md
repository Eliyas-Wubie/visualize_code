# Project Working Instructions

Last verified: 2026-11-01. These project facts supplement the user's global instructions.

## Product and layout

Project Execution Visualizer is a desktop VS Code extension. src/ owns VS Code integration, discovery, graph analysis, diagnostics, and launch selection. webview/ owns the React Flow interface. runtime/ contains opt-in Node.js and Python profiling. sample/ contains synthetic demonstrations. test/ contains Node test-runner suites and real local runtime integration tests. media/bundle.js and media/bundle.css are generated and ignored.

## Setup and commands

Use Node.js 24, npm with package-lock.json, and Python 3.12 for development. Python runtime profiling supports 3.10+. VS Code requires 1.85+; Python language features/debugging require the appropriate installed VS Code extensions. No Python third-party packages are required for the profiler itself.

- Setup: npm ci
- Build: npm run build
- Static checks: npm run check (JavaScript/CommonJS/ESM syntax and Python AST/docstring/whitespace checks)
- Lint: npm run lint
- Format validation: npm run format:check
- Format changes: npm run format
- Full tests: npm test
- Focused test example: node --test test/graph.test.js
- CI test reports: npm run test:ci
- Run extension: press F5; .vscode/launch.json builds first and opens Extension Development Host.

ESLint and Prettier are installed as explicitly approved development-only dependencies. ESLint enforces recommended checks, React hook correctness, and nearby JSDoc on exported functions/public class methods. Python public docstrings are checked by scripts/check_python.py. See the maintenance review for documented tooling advisories and cohesion exceptions.

## Code and safety rules

- Preserve command identifiers, message types, and user changes. The user authorized continued work on the current branch during experimentation; do not create branches, commit, push, merge, or deploy without fresh explicit authorization.
- Keep presentation in webview/, provider adapters in src/, and injected runtime code in runtime/. Use existing dependencies before proposing production additions.
- Document exported functions, externally invoked handlers, Python public methods, failure behavior, and non-obvious constructs. Comment every regex directly above its use.
- Review changed hand-written files over 100 lines for cohesion; split responsibilities, not arbitrary line counts. Formatting alone is not a reason to fragment a cohesive module.
- Never execute project code during discovery. Live execution requires an explicit user action and a trusted workspace. Keep telemetry bounded and local; logs can contain application-provided sensitive text.
- Keep source/parameter/documentation failures explicit. Do not infer unresolved call edges, unknown complexity, or unsupported browser metrics.
- Add observable-behavior regression tests for fixes. Tests use synthetic data and local subprocesses only. No external production services are permitted in normal tests.

## Documentation and delivery

Maintain dev_docs/ architecture, UML, flows, stories, product definition, patterns, and testing/delivery documents. Keep Q&A, plans, and prompt history only in ignored dev_docs/local_only/. Experimentation documentation was deferred at the user's request and resumed on 2026-11-01.

.github/workflows/ci.yml defines local-equivalent gates; remote checks and branch protection have not been inspected or configured. Actions use reviewed major-version pins; npm dependencies use exact versions plus the lock file. No publication, deployment, migration, secrets store, or Marketplace release is configured.

See [testing and delivery](dev_docs/07_testing_and_delivery.md) for category coverage, limits, safe environments, and unverified checks.
