# Maintenance and Standards Review

Last verified: 2026-11-01.

## Enforcement

EditorConfig specifies UTF-8, LF, final newlines, two-space indentation, and four-space Python indentation. Prettier normalizes supported source/configuration/documentation formats. ESLint enforces recommended correctness rules, JSX references, valid React hook usage/dependencies, and JSDoc for exported functions/public class methods. The local documentation rule covers named/default ESM exports and CommonJS module.exports; returned object APIs and non-obvious private helpers still require review.

Python validation parses every runtime/sample/script Python file without executing it, requires public function/constructor/callback docstrings, and rejects tabs/trailing whitespace. JSX is compiled by the build. No claim of full static type checking is made for this JavaScript repository.

## Cohesion review

The 100-line source target is a review threshold. Map rendering was separated into projection/state, toolbar/notices, canvas, minimap controls, and entry composition. Launch selection was separated into option construction, framework targets, Python server configuration, and generic target resolution. App marker classification and entry conventions are separate from app ownership assignment. Complexity estimation is separate from graph enrichment. Tests share a dedicated map-host fixture instead of mixing a large fake host with assertions.

Remaining files over the threshold were reviewed:

| File                      | Reason to retain the cohesive module                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| src/apps-view.js          | A single TreeDataProvider adapter shares discovery cache, invalidation, command routing, and disposal.                                    |
| src/live.js               | Root/child debugger ownership, launch state, and cleanup share lifecycle invariants; launch/configuration decisions are already separate. |
| webview/NodeDetails.jsx   | One modeless details dialog owns focus, source actions, and its related node sections.                                                    |
| webview/DetectionHelp.jsx | Static user-facing documentation; fragmenting sections would obscure reading order.                                                       |
| runtime/logs.cjs          | One bounded capture closure shares counter, source association, fatal handling, and hook restoration.                                     |
| test-support/map-host.js  | A fixture for one bounded mocked VS Code subsystem; fixtures are exempt from the source target.                                           |

No public command or webview message identifier changed during this review. A regression fix now preserves all source lines when several calls target the same function. Callback identities/dependencies were stabilized without changing graph controls.

## Dependency/security findings

Production dependencies were preserved. The approved development tools are exact-version pinned with the lock file. npm reports ESLint 9.39.5 as unsupported and reports six moderate findings in its development-only minimatch-related chain. No high/critical finding was reported by the inspected audit. These findings are documented, not suppressed or silently fixed with a breaking downgrade/override.

The chosen required CI audit fails on high/critical issues across all dependencies. Moderate findings remain visible and require a deliberate tooling upgrade follow-up. Exposure here is the local/CI lint toolchain using project-controlled glob patterns, not a deployed extension runtime endpoint. CI has read-only repository permissions and a timeout. Do not use npm audit fix --force or replace production versions merely to silence the report.

## Documentation and release gaps

Architecture, lifecycle UML, execution flows, user stories, patterns, product definition, testing/delivery, project instructions, and README now describe the implementation. The original user questions and experimentation/standards histories are recorded only under ignored dev_docs/local_only/.

Mermaid sources were checked against implementation and reviewed for syntax, but a local Mermaid renderer is not installed, so rendered output remains unverified. Remote GitHub Actions/branch protection and full VS Code/browser/framework acceptance have not been exercised. User stories deliberately keep their manual acceptance criteria open. No deployment, publication, database migration, or remote mutation was performed.
