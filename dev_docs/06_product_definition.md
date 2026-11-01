# Product Definition

Last verified: 2026-11-01. Status: local VS Code extension prototype; not publicly released.

Code Execution Visualizer helps developers understand how functions and classes in a repository connect, and where activity or problems appear while code runs.

## Users and value

Intended users are developers exploring or debugging an unfamiliar project. They can see shared functions, class relationships, source documentation, warnings, and runtime activity together instead of moving through files one at a time.

## Main capabilities

- Discover separate application candidates in a repository, including React, Next.js, and Python projects.
- Open an entire app, a listed file, or a function selected in the editor as an interactive map.
- Switch between function nodes and class nodes; move, zoom, pan, and navigate with a minimap.
- Click a node for its parameters, existing documentation, source location, diagnostics, and captured logs.
- Show errors in red and warnings in amber when they can be associated with that node.
- Run supported local targets and display Node.js counts/sampled CPU or Python entries/elapsed timing. Show paused debugger call stacks in supported mapped sources.

## Typical use

1. Open a repository in VS Code and select the Visualize Code icon on the left.
2. Choose an app or listed file, or trace a named function from the Command Palette.
3. Explore connections and switch to classes if helpful.
4. Click nodes to inspect details or open source.
5. Optionally select Run live, choose a target, and inspect activity or pause at breakpoints.

## Inputs, outputs, and limits

Inputs are project files, installed language support, debugger configurations, and explicitly requested local runs. The visible output is a map plus node details and status notices. No project code is sent to a remote analysis service.

App detection is based on conventions and can miss unusual layouts. Maps are capped and can omit connections that language tools cannot resolve. Browser targets show paused/stepped frames rather than continuous browser counts. Python needs suitable VS Code language/debugger extensions and installed framework packages. Generated framework code may not map back to source. Complexity labels are approximate local estimates, not promises about total execution time. Logged application data remains local but may be sensitive.

No Marketplace publication, production deployment, data migration, or hosted service is configured.
