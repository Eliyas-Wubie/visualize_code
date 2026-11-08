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

## File/folder view checks (2026-11-08)

Run node --test test/file-map.test.js test/file-details.test.js test/map-model.test.js test/hover-graph.test.js for grouping, normalized file identity, parent bounds/order, merged directed calls/renders and loops, aggregate health/live data, endpoint labels, and escaped file details. Run npm test for the full suite. In the desktop host, select Files, inspect separate folder areas, drag files inside their areas and move areas, hover file links, open file details/source, and click child files in the minimap. These pointer checks remain manual.

## Architecture estimate checks (2026-11-08)

Run node --test test/architecture-map.test.js test/architecture-details.test.js test/file-map.test.js. Tests cover naming evidence, Windows/Python/Next conventions, dependency-backed layered suggestions, qualified MVC/frontend suggestions, unknown/empty input, live health/source IDs, recursion and hover labels, and safe evidence rendering. Existing file tests protect the shared aggregateGraph extraction. Full checks remain npm test, npm run check, npm run lint, npm run format:check, and npm run build. In the desktop host, select Architecture, inspect evidence, compare arrows with function calls, switch modes, hover, drag and navigate with the minimap. Desktop checks remain manual.

## Visual authoring verification (2026-11-08)

Focused command: node --test test/authoring.test.js test/authoring-boundaries.test.js test/authoring-ui.test.js test/editing-session.test.js test/extension-authoring.test.js test/map-sources.test.js test/file-map.test.js. Test-support/authoring-host.js provides real temporary local files and controlled symbol/refactor providers; cleanup verifies its temporary root before removing fixtures. Python scaffolds are AST-checked and JavaScript scaffolds are compiled without execution.

Coverage includes hierarchy/name/no-overwrite boundaries, symlink escape and external references, provider-error sanitization, code revisions and identity guards, JS/Python class methods including tab indentation, controlled reference edits, unsupported rename, mutation locking, applied-write/failed-refresh distinction, new graph identities, cross-panel invalidations, empty resources, and escaped authoring UI. These checks are safe locally and in CI, with synthetic local data only. Normal test/lint/check/build/format commands remain the required gates.

Desktop acceptance: create each entity type through hierarchy dropdowns; add JS/TS and Python class methods; edit source, save and undo; rename methods/classes with real language providers and confirm callers/imports; verify other open map panels refresh; trigger a revision conflict; inspect a provider gap; confirm Architecture has no authoring controls and untrusted workspaces/debug sessions reject edits. Real provider coverage, OS-specific editor undo/save behavior and interactive accessibility remain unverified.

Authoring empty-class regression: node --test test/empty-classes.test.js test/node-info.test.js verifies empty classes remain editable through provider locations and diagnostics stay scoped to their own source file.

Creation-workspace regression checks: node --test test/creation-code.test.js test/node-edit-button.test.js test/authoring-ui.test.js. Coverage includes nested host-ID hierarchy construction, virtual-parent nonselection, actual card Edit controls and click routing, custom file/declaration contents, JS compilation and Python AST validation including nested tab-indented method bodies. Manually confirm left browser/top properties/body geometry, narrow-window layout, native folder expansion and keyboard selection in the desktop host.

Modal dismissal regression: node --test test/authoring-close.test.js checks deterministic hook state under deferred host replies, late-load suppression after Close, submitted-save completion reporting, and real React markup with an enabled Close button while working. Desktop pointer/Escape acceptance remains manual.

Syntax coloring checks: node --test test/syntax-highlight.test.js test/editing-session.test.js test/authoring-ui.test.js. Tests verify exact text reconstruction, escaped/multiline/incomplete literals, Unicode identifiers, large inputs, language choice, safe React rendering and an aria-hidden decorative layer over an accessible textarea. Full checks remain npm test, npm run check, npm run lint, npm run format:check and npm run build. Manually verify vertical/horizontal scrolling, caret/selection alignment, resizing, copy/paste, unknown-file plain text and forced-colors mode in the desktop host.

The code-viewport regression also verifies mirror dimensions exclude native scrollbar space and both scroll axes track the textarea. ResizeObserver keeps geometry current after native resizing; actual pixel alignment and forced-colors behavior still require desktop acceptance.

## Real browser modal regression (2026-11-08)

Build with npm run build, then run npm run test:webview. scripts/check-webview.js serves the actual production bundle/CSS over loopback with test-support/webview-fixture.js, while browser-session.js launches a hidden isolated Chromium profile under ignored reports/. Node.js 24 supplies the WebSocket/CDP client, so no additional package is installed. Standard Windows Edge/Chrome paths are detected; other environments must set VISUALIZER_BROWSER_PATH to a compatible Chromium executable (Chrome 120+ build target). Browser subprocesses and the test server are closed after the run. Profiles remain local in ignored reports/ for diagnostics.

The check uses real pointer and keyboard input for repeated Edit/Close, Escape, pending-load dismissal without late reopening, creation Close, and node-details Close. It checks that the canvas is not duplicated and no uncaught browser exceptions occur. Requests use synthetic source only and cannot mutate project files. Run it locally and in browser-equipped CI; it is separate from npm test so environments without a browser do not silently skip a required test. No remote CI is configured here.

This regression reproduced the stale DOM failure with duplicate sibling React keys even though isolated hook-state tests passed. AuthoringDialog and MapCanvas now use distinct authoring-/canvas- key namespaces. Passing browser smoke validates DOM reconciliation and hit testing; actual VS Code language-provider and save/undo integration remain manual.

Automatic-save regression: node --test test/authoring-autosave.test.js test/editing-session.test.js checks actual temporary disk contents for declaration/file/creation changes, cross-file rename persistence, unrelated dirty-document preservation, and partial-save failure reporting without discarding edits. Native save hooks, format-on-save and undo remain VS Code desktop checks.

## Step-run verification (2026-11-08)

`node --test test/step-run.test.js test/step-breakpoints.test.js test/step-runtime.test.js test/live.test.js test/debug-live.test.js` covers entry positions, docstring exclusion, breakpoint ownership, focus-setting restoration, repeated calls, recursion, exceptions, duplicate Next suppression, failed requests/launches, early session events, unrelated-session isolation and termination. The real Node inspector test proves function-body breakpoints stop repeated same-line calls and recursion until Next. Normal tests execute only synthetic/local code.

`npm run test:webview` exercises production-bundle Step run/Next/Stop and modal regressions against a synthetic loopback host. `node scripts/check-python-step.js <installed-debugpy-adapter-directory>` additionally checks an already-installed Python adapter with verified breakpoints, docstring exclusion, repeated calls and recursion. It installs nothing.

`node scripts/check-vscode-step.js <Code-executable> <installed-extensions-directory>` creates an isolated profile in system temporary storage, plus a synthetic workspace and read-only junctions to existing Python/debugger dependencies under ignored reports/. It disables telemetry/updates for that profile and runs test-support/vscode-step-suite.js through real VS Code APIs. Python and JavaScript each passed six expected pauses, Next continuation, focus override and breakpoint cleanup, with no launch notices. Reports stay local. Actual map pointer/focus behavior in the user's window and React/Next/browser source maps remain manual acceptance items.

Provider acceptance correction (2026-11-08): the VS Code runner now includes the already-installed Pylance extension and builds both graphs through the real document-symbol/call-hierarchy scanApp path, replacing handcrafted graph items. This reproduced the Python identifier-only range failure and verified its fix. Both Python and JavaScript passed six expected pauses and cleanup with no notices. Regression tests cover signature/body selections, identifier-only ranges, cached range resolution, preservation of original provider items, correct paused-node matching, and sanitized setup errors.

Focus regression (2026-11-08): debugger tracker tests verify that owned stopped events receive preserveFocusHint synchronously and ordinary stops remain unchanged. The real VS Code acceptance suite opens a webview flow panel, checks it remains active at every Python/JavaScript pause, and records source-tab events. Twelve expected pauses passed with zero source tabs opened and no launch notices (reports/vscode-step-1794134723233/workspace/results.json).

Stable-layout regression (2026-11-08): production-bundle browser smoke moves a node using keyboard navigation and changes zoom, then compares canvas bounds, every node transform and the viewport transform before/after Step run, Next and Stop. The original conditional execution bar reproduced a 52-pixel canvas shrink; fixed reserved control/status areas pass the exact geometry comparisons.

Sibling-position regression (2026-11-08): the browser fixture now contains a root and two sibling functions, and sends a reordered graph snapshot when Step run starts. Geometry assertions correlate positions by displayed function identity, ensuring a sibling swap cannot pass merely because index-based node slots stay in place. Unit tests verify stable projected IDs/endpoints under reordered discovery and suppress metadata-only document invalidation.

Canvas scope checks (2026-11-08): `node --test test/canvas-scope.test.js test/editing-session.test.js` verifies actual saved file creation outside a function trace, continued hierarchy access, later inclusion through a resolved call, exclusion of unrelated declarations in the same trace file, ownership boundaries for sibling/nested apps, selected-file call expansion, scoped class/folder projection, and rename identity preservation without admitting unrelated changed files. Fixtures use real local files and controlled language-provider results.

UI refresh verification (2026-11-08): hierarchy-search tests retain exact authority IDs, ancestors and folder descendants. Empty-workspace rendering distinguishes initial loading/error/data states and offers Refresh map. Production-bundle browser checks cover pinned Create submission, safe search Enter, hierarchy selection, source editing, dismissal, navigation settings, current/visited colors, and exact layout/viewport preservation. Widths 390px/800px are checked for horizontal page overflow; light-theme canvas color is asserted. Local screenshots under reports/ show desktop, source editor, creation drawer, narrow and light layouts and were visually inspected. Full assistive-technology, touch and high-contrast desktop acceptance remain manual. No dependencies or backend execution adapters changed.

Branch-layout verification (2026-11-08): `node --test test/branch-layout.test.js test/layout.test.js test/call-edge.test.js` covers centered parent/child lanes, nonoverlapping sibling envelopes, shared targets, recursion/cycles, disconnected roots, missing-root fallback, deterministic discovery order, measured card clearance, structural growth, metadata-position preservation and exterior feedback routing. Browser smoke builds an eight-node, three-level flow with uneven branches, shared targets, a cycle and recursion, clicks Auto arrange/Fit, asserts actual card bounds and downward parent/child clearance, and captures reports/flow-branches.png. Existing Step run position/viewport checks remain active.

Python entry regression (2026-11-08): test/map-root.test.js checks method-first provider ordering, selected entry-file priority, main-to-tick-to-calculate levels, explorer root selection and preservation of explicit cursor traces. The real VS Code/Pylance acceptance runner now discovers a class-based sample and verifies main=0, tick=400, calculate=800, with constructor at 400. Python/JavaScript stepping and zero-source-tab checks still pass.
