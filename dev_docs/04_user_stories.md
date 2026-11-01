# User Stories

Last updated: 2026-11-01. These stories backfill the authorized experimentation session. Automated behavior is implemented; complete desktop acceptance remains open, so statuses remain In Progress.

## US-001 — Follow a Function's Calls

As a developer,
I want to follow a starting function across files,
so that I can understand its dependencies.

### Acceptance Criteria

- [x] Graph data preserves function identity, directed calls, recursion, all source call-site lines, and navigation locations.
- [x] Missing providers and graph limits remain explicit.
- [ ] Complete the real VS Code cursor-trace/navigation acceptance journey.

### Implementation

- Status: In Progress
- Relevant components: src/start.js, graph.js, map.js, enrich-graph.js
- Relevant tests: test/graph.test.js, extension.test.js, live-support.test.js
- Last updated: 2026-11-01

## US-002 — Explore a Shared Map

As a developer,
I want a top-to-bottom map with adjustable navigation,
so that I can inspect many connected functions together.

### Acceptance Criteria

- [x] Layout data contains one node per source function and retains shared/cyclic connections.
- [x] Zoom and pan math honors sensitivity and cursor anchoring.
- [ ] Verify drag, zoom, minimap navigation, labels, and keyboard focus in the desktop webview.

### Implementation

- Status: In Progress
- Relevant components: webview/layout.js, main.jsx, useNavigation.jsx, navigation.js
- Relevant tests: test/layout.test.js, navigation.test.js
- Last updated: 2026-11-01

## US-003 — Switch Between Functions and Classes

As a developer,
I want class grouping and class-qualified method labels,
so that I can understand object-oriented code.

### Acceptance Criteria

- [x] Methods resolve to containing class symbols when supported.
- [x] Class projection merges methods and relationships without duplicate nodes.
- [x] Function labels include their owning class.
- [ ] Confirm switching modes and class navigation in VS Code.

### Implementation

- Status: In Progress
- Relevant components: src/classes.js, webview/classGraph.js, ClassNode.jsx, FunctionNode.jsx
- Relevant tests: test/classes.test.js, layout.test.js, node-info.test.js
- Last updated: 2026-11-01

## US-004 — Inspect Documentation and Problems

As a developer,
I want node details with parameters, documentation, logs, and issues,
so that I can investigate a function without losing map context.

### Acceptance Criteria

- [x] Metadata adapters retain supported signatures and existing documentation.
- [x] Error/warning severity is associated by source location; class issues aggregate correctly.
- [x] Real local runtime tests capture synthetic logs and errors while preserving program output/exit behavior.
- [ ] Verify node details, red/amber colors, Escape handling, and accessible focus in VS Code.

### Implementation

- Status: In Progress
- Relevant components: src/parameters.js, documentation.js, diagnostics.js; webview/NodeDetails.jsx, nodeInfo.js
- Relevant tests: test/parameters.test.js, documentation.test.js, node-info.test.js, runtime-logs.test.js
- Last updated: 2026-11-01

## US-005 — Observe Supported Live Execution

As a developer,
I want runtime activity on known source nodes,
so that I can connect execution with the static map.

### Acceptance Criteria

- [x] Execution is explicit and blocked in untrusted workspaces.
- [x] Node.js and Python integration tests stream bounded metrics and preserve fatal errors/arguments.
- [x] Mocked debugger pauses project adjacent known stack frames without inventing edges.
- [x] Launch selection preserves existing environments and supports framework/debugger targets.
- [ ] Verify actual Python/Node/browser debugger sessions and framework source maps in VS Code.

### Implementation

- Status: In Progress
- Relevant components: src/live.js, debug-live.js, launch-targets.js, launch-profile.js, runtime/
- Relevant tests: test/live.test.js, debug-live.test.js, runtime*.test.js, python*.test.js, launch-targets.test.js
- Last updated: 2026-11-01

## US-006 — Discover Repository Applications

As a developer,
I want a left-side app explorer and file/app-wide maps,
so that I do not need to choose a starting function manually.

### Acceptance Criteria

- [x] Manifest/convention detection separates nested apps and reports malformed markers.
- [x] Sidebar file actions open visualizer maps rather than source editors.
- [x] App scanning seeds functions across files and labels missing call support.
- [x] Resolved JSX component references are distinct render relationships.
- [ ] Validate real React, Next.js, and Python language-provider projects in the extension host.

### Implementation

- Status: In Progress
- Relevant components: src/apps-view.js, workspace-apps.js, app-detection.js, app-scan.js, react-links.js
- Relevant tests: test/app*.test.js, react-links.test.js, activation.test.js
- Last updated: 2026-11-01

## US-007 — See Conservative Complexity Estimates

As a developer,
I want clearly qualified Big-O estimates,
so that I can identify potentially costly local loop structures.

### Acceptance Criteria

- [x] Supported local JS/TS loop patterns produce estimates; ambiguous syntax and recursion stay Unknown.
- [x] Explanations exclude callee/library/I/O cost and distinguish local estimates from guarantees.
- [ ] Confirm badges and assumption tooltips in both desktop map modes.

### Implementation

- Status: In Progress
- Relevant components: src/complexity.js, complexity-tokens.js, webview/ComplexityBadge.jsx
- Relevant tests: test/complexity.test.js
- Last updated: 2026-11-01
