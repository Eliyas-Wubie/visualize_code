# Function Discovery Lifecycle

Diagram type: stateDiagram-v2. Last verified: 2026-11-01.

## Purpose and scope

Describe graph-node discovery without documenting every helper. These are conceptual states derived from loaded and callSupport, not a separate runtime enum.

```mermaid
stateDiagram-v2
  [*] --> Unexpanded: provider item registered
  Unexpanded --> Expanded: outgoing calls returned
  Unexpanded --> Unexpanded: provider fails and error is shown
  Unexpanded --> Unavailable: symbols exist without call hierarchy
  Expanded --> Expanded: repeated expansion is deduplicated
```

CallGraph.add registers stable source identities; expand adds edges and marks a successful node loaded. A provider error preserves retryability. App scanning can retain a symbol-only node with an explicit unsupported-call message. Newly discovered callees each begin their own lifecycle; the expanded caller is not reset.

Relevant implementation: src/graph.js, src/app-scan.js, webview/useGraph.jsx. Runtime metrics and diagnostics decorate nodes independently of this lifecycle. No persistence or database entities exist. Mermaid rendering remains unverified locally.
