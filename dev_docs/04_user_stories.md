# User Stories

Last updated: 2026-11-01. These stories backfill the authorized experimentation session. Automated behavior is implemented; complete desktop acceptance remains open, so statuses remain In Progress.

## US-001 â€” Follow a Function's Calls

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

## US-002 â€” Explore a Shared Map

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

## US-003 â€” Switch Between Functions and Classes

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

## US-004 â€” Inspect Documentation and Problems

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

## US-005 â€” Observe Supported Live Execution

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

## US-006 â€” Discover Repository Applications

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

## US-007 â€” See Conservative Complexity Estimates

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

## US-008 ? Explore Connections on Hover

As a developer,
I want nodes and connections to highlight their immediate relationships on hover,
so that I can trace callers and callees on a crowded map.

### Acceptance Criteria

- [x] Hovering a function or class highlights its incident edges and direct neighbors.
- [x] Hovering a connection highlights its endpoints and displays their names.
- [x] Hover exit restores original live styles and labels without changing layout or health data.
- [x] Isolated nodes, recursive edges, and mode changes are handled.
- [ ] Confirm pointer interactions and label readability in the desktop extension host.

### Implementation

- Status: In Progress
- Relevant components: webview/MapCanvas.jsx, hoverGraph.js, hover.css, CallEdge.jsx
- Relevant tests: test/hover-graph.test.js, test/call-edge.test.js
- Last updated: 2026-11-04

## US-009 ? View File Interactions in Folder Areas

As a developer,
I want folder areas containing file nodes with directed interaction links,
so that I can understand how source files work together.

### Acceptance Criteria

- [x] Files mode groups discovered source files by containing directory in labeled areas.
- [x] Files merge known calls/renders by directed file pair and relationship kind; internal links remain loops.
- [x] File details list known functions, associated diagnostics/logs, and aggregate metrics.
- [x] Hover highlighting, dragging within areas, and minimap navigation respect grouped positions.
- [x] Notices explain that import-only dependencies and files with no discovered functions are excluded.
- [ ] Confirm folder areas, dragging, and minimap behavior in the desktop extension host.

### Implementation

- Status: In Progress
- Relevant components: webview/fileGraph.js, folderLayout.js, FileNode.jsx, map-model.js, MapHeader.jsx, MapCanvas.jsx, MapOverview.jsx
- Relevant tests: test/file-map.test.js, file-details.test.js, hover-graph.test.js
- Last updated: 2026-11-08

## US-010 ? Inspect Estimated Architecture

As a developer,
I want a visual responsibility and dependency map with an explained architecture estimate,
so that I can understand the organization of the scanned code.

### Acceptance Criteria

- [x] Architecture mode renders responsibility areas in top-to-bottom rows with known directed links.
- [x] Area details expose member functions/files and classification evidence plus associated health/live data.
- [x] Layered suggestions require observed controller/UI-to-service and service-to-data/domain links.
- [x] MVC naming and React/Next frontend suggestions are explicitly qualified estimates.
- [x] Unknown, empty, and partial scans remain explicit; no inferred external systems or call edges are added.
- [ ] Confirm layout, detail readability, hover and minimap behavior in the desktop extension host.

### Implementation

- Status: In Progress
- Relevant components: webview/architectureRoles.js, architectureGraph.js, architectureLayout.js, ArchitectureNode.jsx, aggregateGraph.js, map-model.js
- Relevant tests: test/architecture-map.test.js, architecture-details.test.js, file-map.test.js
- Last updated: 2026-11-08

## US-011 ? Create and Edit Source from Maps

As a developer,
I want to create entities at a chosen hierarchy location and edit source from nodes,
so that my visual map and actual project evolve together.

### Acceptance Criteria

- [x] Non-architecture views offer file/folder/function/class creation with host-owned hierarchy choices.
- [x] Function creation supports top-level declarations or class methods in JS/TS/Python.
- [x] Empty file/folder resources remain visible in Files mode, and recognized empty classes remain in OOP after edits.
- [x] Node and per-function editing loads actual declaration/file source with version checks.
- [x] Renaming uses the language provider's workspace edits and fails explicitly without rename support.
- [x] Body/parameter edits and semantic rename are separate actions, with call-site limits explained.
- [x] Maps rebuild fresh symbols/IDs and invalidate other mapped source panels after text changes.
- [x] Trusted local scope, no-overwrite, symlink boundaries, debugger idleness and sanitized errors are enforced.
- [ ] Verify real JS/TS and Python provider rename, class creation, source undo/save, and hierarchy interactions in VS Code.

### Implementation

- Status: In Progress
- Relevant components: src/editing.js, edit-targets.js, edit-operations.js, edit-symbol.js, create-entity.js, refresh-map.js, map-messages.js, map-sources.js, webview/useAuthoring.jsx, CreateEntityForm.jsx, SourceEditForm.jsx
- Relevant tests: test/authoring*.test.js, editing-session.test.js, extension-authoring.test.js, map-sources.test.js, file-map.test.js
- Last updated: 2026-11-08

## US-012 ? Use a Source Authoring Workspace

As a developer,
I want direct node editing and a creation workspace with a file browser and code body,
so that I can work on code without stepping through a stacked location form.

### Acceptance Criteria

- [x] Editable function/class/file cards expose an Edit button opening actual source without selecting/dragging the card.
- [x] Creation shows a collapsible folder/file hierarchy on the left and metadata across the top of the editor pane.
- [x] File contents and function/class bodies are accepted in the main code area and included in creation.
- [x] Hierarchy uses host IDs; virtual parents cannot be chosen as filesystem targets.
- [x] Empty declaration bodies retain default scaffolds; folders have no code area.
- [x] Architecture remains read-only, and existing rename/revision/workspace guards remain active.
- [x] Close/Escape dismiss authoring during pending requests; late reads cannot reopen it and submitted writes still report their result. Real browser checks also cover distinct sibling keys and stale-DOM removal.
- [ ] Confirm desktop layout, tree expansion/selection, keyboard navigation and editor interactions.

### Implementation

- Status: In Progress
- Relevant components: webview/NodeEditButton.jsx, HierarchyBrowser.jsx, hierarchy-model.js, CreationProperties.jsx, CreateEntityForm.jsx, authoring.css; src/create-entity.js, entity-source.js
- Relevant tests: test/node-edit-button.test.js, creation-code.test.js, authoring-ui.test.js, authoring.test.js
- Last updated: 2026-11-08

## US-013 ? Read Highlighted Editable Source

As a developer,
I want syntax colors while creating and editing code,
so that code structure is easier to read.

### Acceptance Criteria

- [x] Source and creation editors use the same escaped token-coloring component.
- [x] Language comes from the host document or selected/new file extension.
- [x] JS/TS/JSX/TSX, Python and JSON/JSONC have lexical coloring; unknown languages stay plain.
- [x] Editable text remains unchanged, including unfinished tokens and whitespace.
- [x] Native textarea input/caret/selection and synchronized scrolling are retained; decorative text is hidden from assistive technology.
- [ ] Confirm overlay alignment, scrolling, caret/selection and forced-colors mode in the desktop webview.

### Implementation

- Status: In Progress
- Relevant components: webview/CodeEditor.jsx, syntax-tokens.js, syntax.css, CreateEntityForm.jsx, SourceEditForm.jsx; src/edit-symbol.js, edit-operations.js
- Relevant tests: test/syntax-highlight.test.js, editing-session.test.js, authoring-ui.test.js
- Last updated: 2026-11-08

## US-014 ? Save Authored Changes Automatically

As a developer,
I want edits and reference renames to save their affected source files automatically,
so that the project on disk matches the changes I apply in the visualizer.

### Acceptance Criteria

- [x] Declaration/file edits and creation save affected documents after successful WorkspaceEdit application.
- [x] Rename saves declaration and reference documents, deduplicating URI targets.
- [x] Unrelated dirty files are not saved.
- [x] Partial save failures retain applied changes, name unsaved files, and preserve refresh warnings.
- [ ] Verify native VS Code save actions, permissions, formatting-on-save and undo with real providers.

### Implementation

- Status: In Progress
- Relevant components: src/apply-and-save.js, edit-symbol.js, edit-file.js, create-entity.js, edit-operations.js, editing.js, webview/useAuthoring.jsx
- Relevant tests: test/authoring-autosave.test.js, editing-session.test.js, authoring-close.test.js
- Last updated: 2026-11-08

## US-015 ? Persistent Node Editing Controls

As a developer,
I want direct editing and controls that stay visible while scrolling,
so that I can inspect and change large declarations easily.

### Acceptance Criteria

- [x] Double-click opens editing for editable function, class and file nodes.
- [x] Source Save/Close and details Edit/Close remain above scrolling content.
- [x] Edit buttons use pencil icons with accessible names and tooltips.
- [x] Browser regression checks exercise double-click, scrolling and Save submission.

### Implementation

- Status: Implemented
- Relevant components: webview/MapCanvas.jsx, AuthoringDialog.jsx, SourceEditForm.jsx, NodeDetails.jsx, NodeEditButton.jsx, authoring.css
- Relevant tests: scripts/check-webview.js, test/node-edit-button.test.js, authoring-ui.test.js, authoring-close.test.js
- Last updated: 2026-11-08

## US-016 ? Step Through Function Execution

As a developer,
I want execution to pause at mapped function entries and advance with Next,
so that I can follow execution progress on the map.

### Acceptance Criteria

- [x] Step run is beside Run live and uses trusted debugger launches.
- [x] Bottom Next/Stop controls show execution status and pause/visited counts.
- [x] Start/Next/Stop preserve canvas size, arranged node positions and viewport; idle controls reserve their space.
- [x] Reordered discovery snapshots retain each function identity and position instead of swapping sibling nodes.
- [x] Current, call-stack and visited functions have distinct colors and text labels.
- [x] Temporary function-body breakpoints are installed before launch; every hit waits for Next, including repeated calls and recursion.
- [x] Only owned breakpoints are removed and temporary focus settings restored on finish/failure.
- [x] Next targets only the retained paused session/thread and cannot overlap itself.
- [x] Termination disables Next and preserves visited progress; request failures are visible.
- [x] Real VS Code Python/Pylance and JavaScript discovery plus launches pause at expected calls and clean up after completion.
- [x] Owned Step run pauses keep the flow panel active without opening source tabs; ordinary debugging keeps its normal focus behavior.
- [x] Identifier-only provider ranges recover complete declarations without changing the provider payload; setup errors identify unresolved functions.
- [ ] Validate map focus in the user window and React/Next browser source maps.

### Implementation

- Status: In Progress
- Relevant components: src/step-run.js, live.js, debug-live.js, live-match.js, map-messages.js; webview/StepControls.jsx, useGraph.jsx, liveGraph.js, step.css
- Relevant tests: test/step-run.test.js, step-breakpoints.test.js, step-runtime.test.js, live.test.js, debug-live.test.js; scripts/check-webview.js, check-python-step.js, check-vscode-step.js
- Last updated: 2026-11-08

## US-017 ? Preserve Canvas Scope During Entity Creation

As a developer,
I want unrelated creations to stay outside my current map,
so that authoring does not change the project or execution flow I am exploring.

### Acceptance Criteria

- [x] Created files/declarations are saved and remain accessible in the creation hierarchy.
- [x] Function traces retain only the selected root and reachable calls, including after creation in the same file.
- [x] Selected-file maps seed that file and follow calls inside its app instead of seeding all changed files.
- [x] Entire-app maps refresh ownership and exclude sibling/nested apps, including new files.
- [x] Canvas file/folder/class projections obey the same scope; applicable empty app/file resources remain visible.
- [x] Rename refresh preserves the selected root without adding unrelated changed files.

### Implementation

- Status: Implemented
- Relevant components: src/canvas-scope.js, refresh-map.js, edit-targets.js, map-state.js, map.js
- Relevant tests: test/canvas-scope.test.js, editing-session.test.js
- Last updated: 2026-11-08

## US-018 ? Focused Flow Workspace

As a developer,
I want a clear, consistent visual workspace,
so that I can navigate, inspect, create and run code without losing graph context.

### Acceptance Criteria

- [x] Compact header and grouped actions prioritize the canvas; navigation controls sit at its edge with a zoom percentage.
- [x] Shared category/card/icon design distinguishes functions, classes, files and architecture areas.
- [x] Contextual drawers keep Create/Save/Close pinned and preserve the graph viewport.
- [x] Creation hierarchy search retains authorized targets and does not submit mutations on Enter.
- [x] Dark/light styling, visible keyboard focus, reduced motion and narrow layouts are provided.
- [x] Existing scope, execution, hover, source editing and stable-layout regression checks pass.
- [ ] Complete assistive-technology, high-contrast and touch-device acceptance in desktop VS Code.

### Implementation

- Status: In Progress
- Relevant components: webview/theme.css, workspace.css, nodes.css, inspectors.css, canvas.css, Icon.jsx, NodeHeading.jsx, MapHeader.jsx, MapToolbar.jsx, MapOverview.jsx, AuthoringDialog.jsx, CreateEntityForm.jsx, HierarchyBrowser.jsx, StepControls.jsx
- Relevant tests: test/hierarchy-search.test.js, workspace-ui.test.js; scripts/check-webview.js
- Last updated: 2026-11-08

## US-019 ? Downward Branch Lanes

As a developer,
I want roots and subsequent branches to expand downward into separate lanes,
so that neighboring branches remain readable without overlapping cards.

### Acceptance Criteria

- [x] Each node is placed once, with new tree children below their parent and parent cards centered over their subtree.
- [x] App/file maps prefer a top-level main over first-discovered methods; explicit cursor traces keep their chosen root.
- [x] Neighboring branches reserve space for their descendants and expand outward rather than colliding at the same level.
- [x] Shared targets, cycles and recursion keep their original connections without duplicate nodes.
- [x] Feedback/peer links route outside node bounds; ordinary calls remain downward curves.
- [x] Auto arrange respects measured card dimensions; topology changes make room for new branches.
- [x] Execution/diagnostic updates and reordered snapshots preserve positions and viewport.

### Implementation

- Status: Implemented
- Relevant components: webview/branch-positions.js, layout.js, layout-state.js, useMapNodes.jsx, map-model.js, return-routes.js, MapCanvas.jsx, CallEdge.jsx
- Relevant tests: test/branch-layout.test.js, layout.test.js, call-edge.test.js; scripts/check-webview.js
- Last updated: 2026-11-08

## US-020 ? Wait for Language Support

As a developer,
I want a visible loading state when opening a map,
so that language-server startup does not appear as missing functions.

### Acceptance Criteria

- [x] File/app panels open immediately with loading progress.
- [x] Cold symbol providers retry for up to 30 seconds per file.
- [x] Cancel prevents late results from publishing; Retry starts a fresh scan.
- [x] Missing support and failures show an actionable retry state.

### Implementation

- Status: Implemented
- Relevant components: src/provider-ready.js, app-scan.js, extension.js, map.js; webview/useGraph.jsx, main.jsx
- Relevant tests: test/provider-ready.test.js, extension.test.js, map-root.test.js
- Last updated: 2026-11-08
