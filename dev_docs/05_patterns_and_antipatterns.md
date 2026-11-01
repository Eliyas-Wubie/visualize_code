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
