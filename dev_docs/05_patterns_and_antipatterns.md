# Patterns and Antipatterns

Last verified: 2026-11-01.

## Provider adapters with explicit gaps

Problem: multiple languages/frameworks need symbol and call information. Use VS Code provider commands at dedicated adapter boundaries, as in src/app-scan.js, classes.js, and documentation.js. Do not use this as proof of runtime completeness or replace unresolved information with fabricated edges. Tradeoff: no production parser dependencies, but results depend on installed language providers.

## Bounded graph projection

Problem: shared callees, cycles, class aggregation, and runtime overlays can duplicate work or overwhelm the view. Use stable source identities in src/graph.js and pure projections in webview/layout.js, classGraph.js, liveGraph.js, and nodeInfo.js. Do not use graph limits to claim full coverage. Tradeoff: predictable memory and testable transformations, with explicit truncation.

## Opt-in runtime adapters

Problem: observing execution must not make discovery execute code. Keep launch selection in src/launch-targets.js, environment injection in launch-profile.js, and collectors in runtime/. Use this when execution is explicitly requested and workspace trust permits it. Do not use it for automatic background execution. Tradeoff: local counts/logs without a backend, but profiling overhead and runtime-specific accuracy limits.

## Antipattern: silently treating missing data as a complete result

Missing symbols, failed providers, unmatched frames, or unknown complexity must not be reported as definitive absence of calls or constant runtime. Identify this through missing-call notices, Unknown estimates, and provider-failure regression tests. Preferred alternative: explicit unavailable/partial state and retryable failures. No claim is made that every remaining edge case has been eliminated.

## Antipattern: mixing UI labels with source authority

Never accept arbitrary file paths from a webview and execute/open them directly. Resolve known IDs against host-owned source items, and keep app membership checks in sidebar command handlers. Existing implementation: src/map.js and apps-view.js. Tradeoff: additional mapping state protects navigation and execution boundaries.

## Host-authoritative versioned authoring

Problem: visual forms must change source without accepting arbitrary paths, stale text ranges, or guessed reference rewrites.
When to use: explicit source creation/edit/refactor actions from a webview. When not to use: read-only architecture projections or discovery.
Implementation: host-owned hierarchy IDs and snapshot tokens, realpath workspace checks, revision guards, WorkspaceEdit and language-provider rename. Representative locations: src/editing.js, edit-operations.js, edit-symbol.js, edit-safety.js. Text changes remain undoable, then automatically save only affected documents; folders use the workspace filesystem. Save failures preserve dirty edits and report partial success explicitly.
Tradeoffs: provider coverage limits rename completeness, stale changes require reload, and code edits can invalidate a partial map until a rescan succeeds. The same guards apply to file/declaration saves and provider refactors.

Avoid global string replacement for symbol identity: it can alter unrelated names/comments/strings and miss real references. Prefer executeDocumentRenameProvider and fail explicitly when unsupported. Current rename implementation has no textual replacement fallback; raw source editing remains explicitly separate from semantic rename.

## Pinned form actions

- Problem: a long editor or creation form can scroll its submit action out of view.
- Use when: a modeless authoring drawer needs persistent header actions while local form state stays inside its component.
- Do not use when: an action belongs to a different form or requires an unrelated operation.
- Implementation: React portals place the action in the drawer header; the native form attribute links it to a useId-generated form ID. No document queries or synthetic click forwarding are required.
- Representative locations: webview/SourceEditForm.jsx, CreateEntityForm.jsx, AuthoringDialog.jsx.
- Tradeoffs: the header target mounts after the first render, so a standalone/initial inline action remains available until the portal target exists. Real-browser tests verify submission and dismissal.
