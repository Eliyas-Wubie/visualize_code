# Testing and Delivery

Last verified: 2026-11-01.

## Setup and exact commands

Use Node.js 24 and Python 3.12; runtime Python adapters require 3.10+. Run npm ci from the repository root. Tests require the python executable on PATH and use no third-party Python packages. Production dependencies are exactly pinned in package.json/package-lock.json.

| Purpose           | Command                                                       | Scope                                                                |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Static checks     | npm run check                                                 | JS/CJS/MJS syntax plus Python AST, public docstrings, and whitespace |
| JSX compilation   | npm run build                                                 | React/webview bundle; generated files are ignored                    |
| Lint              | npm run lint                                                  | ESLint correctness, public JSDoc, JSX-use, and React-hook rules      |
| Formatting        | npm run format:check                                          | Prettier check; npm run format applies formatting                    |
| Focused unit test | node --test test/graph.test.js                                | Graph behavior and regression cases                                  |
| Full suite        | npm test                                                      | All test/*.test.js suites, including local runtime subprocesses      |
| CI reports        | npm run test:ci                                               | Same suite, with JUnit output in ignored reports/tests.xml           |
| Ignore rules      | git check-ignore dev_docs/local_only/questions_and_answers.md | Local documentation stays untracked                                  |
| Diff hygiene      | git diff --check                                              | Tracked diffs; also inspect new files separately                     |

ESLint/Prettier dependencies were explicitly approved and installed as development-only packages. No runtime/production dependency was added. Lint also enforces exported-function/public-method JSDoc through scripts/public-docs-rule.cjs. Python checks validate AST syntax and public/nested callback documentation without running application code. Formatting covers supported JS/JSX, JSON, CSS, Markdown, YAML, and SVG; Python formatting is reviewed manually and its whitespace is checked mechanically.

## Applicable test categories

| Category             | Purpose and location                                                                                                                    | Commands and limits                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Unit/regression      | Graphs, metadata, app classification, matching, navigation, complexity in test/                                                         | Focus a named test file; full npm test                                                                            |
| Component/functional | Mocked VS Code activation/sidebar/messages/launch choices, pure map projection, and real React server-rendered details in test/         | npm test; these are not real VS Code UI tests                                                                     |
| Integration/smoke    | Node.js preload/IPC and Python runners execute synthetic samples, preserve output/errors, and exit cleanly                              | node --test test/runtime.test.js test/runtime-logs.test.js test/python-runtime.test.js test/python-errors.test.js |
| Security/contract    | Unknown IDs, trust gating, bounded telemetry, source associations, and message shape behavior in extension/live/runtime/node-info tests | npm test; no penetration or production targets                                                                    |
| Compatibility        | Local Windows Node/Python testing; CI matrix proposes Windows and Ubuntu                                                                | Remote matrix has not run locally                                                                                 |
| Resilience           | Provider failures, cancellation, malformed records, retryability, fatal exits, and cleanup                                              | npm test; no paid/external services                                                                               |
| Accessibility        | Server-rendered dialog labels and escaped text; manual keyboard/focus/reduced-motion checks                                             | Manual VS Code checklist below; no automated browser/accessibility suite exists                                   |

Full browser/VS Code end-to-end and framework-server smoke tests remain unverified. There is no established coverage threshold; do not invent a percentage. No database, migration, throughput target, or hosted production service exists, so migration/load/post-deployment categories are not currently applicable. Add them when corresponding requirements exist.

## Local verification on 2026-11-01

Formatting, ESLint (including public documentation and React hooks), JavaScript syntax, Python AST/docstrings/whitespace, all 62 tests, the bundle build, JUnit XML parsing, CI YAML parsing/required-gate review, build-content hashes, dependency-lock consistency, Markdown local links/fences, and ignore rules passed locally. Production dependency versions were confirmed unchanged; their audit reported zero vulnerabilities. The required all-dependency high/critical audit passed with six moderate development-only findings; see the maintenance review. This does not establish that remote CI or desktop/browser acceptance has passed.

## Manual UI and release checks

Press F5, open synthetic samples in Extension Development Host, and confirm app/file/function maps, OOP toggle, source navigation, tab names, parameter/docs/details, colors, pan/zoom/minimap, cancellation, and stale-host diagnostics. Test Node/Python runs and breakpoint stepping. For React/Next.js, use an isolated app with preinstalled dependencies; confirm dev-server/browser launch and source maps. Check keyboard focus, Escape dismissal, contrast, and reduced motion. These UI checks must be completed before release; automated mocked tests do not substitute for them.

## CI/CD

.github/workflows/ci.yml defines GitHub Actions validation for pull requests and pushes to main: read-only repository permissions, cancelled obsolete runs, Node.js 24/Python 3.12, lock-file installation, format/lint/static/test/build gates, an all-dependency audit failing on high or critical findings, and synthetic test reports. Actions are pinned to reviewed major versions under this repository policy; upgrade them deliberately. No secrets are required. The selected major versions follow the official [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [setup-python](https://github.com/actions/setup-python), and [artifact](https://github.com/actions/upload-artifact) documentation.

Reports and compiled webview bundles are retained as revision-named CI artifacts for seven days. They are validation artifacts, not a published VSIX. The intended required checks are the matrix test jobs; remote branch protections have not been inspected or modified. Remote CI and artifact uploads have not been exercised.

No deployment/publishing workflow or staging/production environment exists. Before a release, complete the UI checklist, choose packaging/license/publisher details, verify the exact revision's CI, and obtain explicit publication approval. Recovery during local development is to stop debug sessions and restart the host; runtime hooks are restored on normal Python shutdown and temporary trace state is disposed at session end. Do not claim rollback or production recovery has been tested.
