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

## Relationship hover (2026-11-04)

Hover over a function or class to highlight the directly connected nodes and lines. Hover over a line to highlight its two endpoints and show their names. The hovered node uses cyan; connected nodes and edges use purple. Error and warning indicators remain visible. Desktop pointer acceptance is still pending.

## Files view (2026-11-08)

Select Files to see labeled folder areas with source files inside them. Arrows show the detected calls and component renders between files; loops represent interactions inside one file. Hover highlights related files and shows full file paths. Click a file to see its discovered functions, diagnostics, logs, and recorded metrics. Each area represents a containing directory, with its path shown; nested directories appear as separate areas. The view includes only files that contain functions already found by the scan, rather than every file or import in the repository. Desktop acceptance remains pending.

## Architecture estimate (2026-11-08)

Select Architecture to see broad code responsibilities, such as screens, request handlers, business services, and data access, connected by the calls found in the scan. A suggestion describes a possible layered, MVC-style, or component-oriented organization when naming/framework/call evidence supports it. MVC means separating models, views, and controllers. These are estimates of the scanned code, rather than proof of the intended design. Click an area to inspect its files and the naming evidence. Unmatched files stay Unclassified, and insufficient evidence displays Architecture undetermined. This view does not identify deployed servers, microservices, databases, or enforce design rules. Desktop visual acceptance remains pending.

## Visual authoring (2026-11-08)

In Functions, OOP or Files, use New entity to create files, folders, functions or classes. A dropdown shows containing folders/files; another chooses a class when adding a method. JavaScript, TypeScript and Python get simple declaration scaffolds. Empty files and folders appear in Files view.

Click a node and Edit node to inspect and apply its real source code. File/class details also let you edit individual functions. A separate Rename references action asks the installed language tools to update a function or class name wherever those tools recognize its references. Editing parameters or bodies does not rewrite other call arguments. Save code changes before renaming, and keep the selected identifier in its original source position when applying source text.

Edits and renames automatically save the affected files, while retaining normal text undo. Reference files changed by renaming are saved too, and unrelated unsaved documents are left alone. If saving fails, the applied changes stay in memory and a warning identifies the unsaved files. The map refreshes after changes, and it rejects an old edit if the document changed meanwhile. Authoring needs a trusted local workspace and no active debugger; Architecture is read-only. The hierarchy is bounded, provider gaps remain visible, and no source is executed just to create or edit an entity. Real desktop and language-provider acceptance remains pending.

## Authoring workspace layout (2026-11-08)

Each editable function, class and file card has an Edit button that opens its code. Creation uses a folder/file browser on the left, name and scope properties at the top of the editor pane, and a large code area underneath. Write complete contents for a new file, or just the inside of a function/class; the name and outer declaration are generated. Blank declaration bodies use the default scaffold, and folders have no source code. The browser preserves actual project nesting and uses the host-provided targets. Interactive desktop acceptance remains pending.

## Editable syntax colors (2026-11-08)

Creation and source-edit boxes color common keywords, strings, comments, numbers and function/type names for JavaScript/TypeScript, Python and JSON. The source document or file extension selects the language; other languages remain plain text. Coloring does not change code or validate its correctness. Complex embedded expressions use basic coloring rather than a complete language grammar. Caret, selection, typing and copying stay in a normal text box. Interactive desktop/high-contrast checks remain pending.

## Step execution (2026-11-08)

Step run automatically adds temporary breakpoints inside discovered functions. Execution pauses at each hit until the bottom Next button is clicked; Stop ends the run. Yellow identifies the paused function, purple its call stack and green visited functions. Counts and the current function make progress visible. The visualizer stays in focus; its breakpoints and temporary focus setting are cleaned up afterward while existing user breakpoints remain intact. This requires a working debugger and source maps for bundled code. Unsupported function bodies are listed, and native or undiscovered calls may not appear. Exceptions and user breakpoints also pause. Real VS Code Python/JavaScript acceptance passed; browser/framework source-map acceptance remains pending.

Execution controls remain visible before a run, with Next and Stop disabled. Starting, advancing or stopping execution preserves the map layout and zoom rather than shrinking the canvas when controls appear.

Creating an entity preserves the opened map scope. App maps show resources belonging to that app, excluding separate nested/sibling apps. File maps show the selected file and its reachable calls; function traces show the selected function and reachable calls. Unrelated creations are saved and remain in the creation hierarchy, but appear on a canvas only when that scope is opened or a call connects them.

## Refreshed flow workspace (2026-11-08)

The canvas is surrounded by compact run/create controls, a mode switch and a persistent execution strip. Functions, classes, files and architecture areas share consistent category headers and pencil actions. Zoom percentage, fit-to-map, auto-arrange, minimap and navigation sensitivity are available at the canvas edge. Inspecting or editing opens a side drawer so the surrounding graph stays visible on wide windows. Creation locations can be searched without losing their folder hierarchy. Create, Save and Close remain available while scrolling. Dark/light themes, visible keyboard focus and reduced-motion styling support different viewing preferences; narrow windows adapt controls and drawers without automatically rearranging the graph. Existing source-derived connections and canvas scope are preserved.

Function/class layouts now branch down from the starting point and spread neighboring subtrees outward. A function called from several places still appears only once. Links back to existing nodes travel around the cards. Auto arrange uses current card sizes for clearance; execution highlighting does not rearrange the map. New nodes or changed connections can trigger a fresh arrangement to make room for the changed structure.

App and file maps prefer a top-level main function as their visual starting point when available, rather than choosing the first discovered class method. This is a naming convention, not proof of runtime entry. Trace from Cursor and Choose Starting Function keep the function explicitly selected by the user.

File/app maps open with loading progress while language support initializes. Symbol requests retry for up to 30 seconds per file; users can cancel or retry without accepting late cancelled results. Confirmed 2026-11-08.

App-wide scans isolate per-file failures and retain usable results with file-specific notices. Valid empty symbol arrays are accepted after a one-second stabilization window for nonempty files; missing provider responses still have a 30-second timeout. All-file failures keep the retry screen. Verified 2026-11-09.
