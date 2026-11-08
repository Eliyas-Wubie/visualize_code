<video src="https://github.com/Eliyas-Wubie/visualize_code/raw/refs/heads/main/media/extention_demo.mp4" controls autoplay muted loop playsinline width="100%" aria-label="Code Execution Visualizer demo"></video>

# Code Execution Visualizer

Explore your code as a connected, top-to-bottom map of functions and classes. Discover separate applications in a repository, inspect function details, and follow supported live execution activity.

## Get started

1. Install **Code Execution Visualizer** in VS Code and open your project folder.
2. Click **Visualize Code** in the left Activity Bar.
3. Select an application or listed file to open its map.
4. Switch between **Functions**, **OOP**, **Files**, and **Architecture** to explore functions, classes, files grouped by folder, or estimated architecture areas. Use the minimap and canvas-edge zoom, fit, arrange, and navigation-settings controls to navigate.
5. Click a node to inspect its parameters, file, documentation, diagnostics, and available runtime logs.

To start from one function, place the cursor inside it and run **Visualize Code: Trace from Cursor** from the Command Palette. You can also run **Visualize Code: Choose Starting Function**.

## Explore the map

- **Architecture:** see estimated UI, controller/API, service, domain, data, shared, and test responsibilities with detected calls between them. The view suggests layered-style, MVC-style, or component-oriented organization only when matching evidence exists. Click an area for its files and classification evidence. Unclear structures remain **Architecture undetermined**, with unmatched files marked **Unclassified**. This does not verify deployment boundaries or design-rule compliance.

- **Folders and files:** choose Files to see containing folders as areas and files as nodes. Arrows merge detected calls/renders between files; loops show interactions within a file. Hover to trace links or click a file for its discovered functions and health. Files view includes files and folders within the current canvas scope, including empty resources in an entire-app map; links are drawn only from discovered code relationships.

- **Hover relationships:** hover a node to light up its direct connections and neighboring nodes. Hover a connection to highlight both endpoints and display their names.
- **Function maps:** connected functions and class methods, with names such as `ClassName.method`. Roots branch downward; each subtree gets its own horizontal lanes, while shared targets appear once. Feedback links route outside the cards. Use **Auto arrange** at the canvas edge to apply the layout using measured node sizes.
- **Class maps:** switch to OOP mode to explore relationships between classes.
- **Node details:** parameters, source file, available documentation, warnings, errors, and estimated Big-O complexity when supported.
- **Navigation:** a clickable minimap, adjustable zoom/pan sensitivity, and separate tabs named after the selected starting point.
- **Application discovery:** find separate JavaScript/TypeScript, React, Next.js, and Python applications within a repository.

Click **?** in the visualizer for details about how symbols and connections are detected.

## Step through execution

Choose **Step run** beside **Run live**, then select the launch target. The extension automatically adds temporary breakpoints inside discovered functions before starting the debugger. Execution waits at each hit, including repeated calls and recursion. Use **Next** at the bottom to continue to the next breakpoint, or **Stop** to finish. Yellow marks the paused function, purple its call stack, and green visited functions. The bar shows the current function, pause/visited counts and automatic breakpoint count.

The visualizer retains focus on pauses. Step run temporarily suppresses debugger editor focus and restores the previous workspace setting afterward. Its own breakpoints are removed on completion, failed launch or disposal; your existing breakpoints are preserved. Unresolved bodies are listed explicitly. Step run requires the appropriate debugger and source maps for bundled code; native, skipped or undiscovered calls may not be shown. Exceptions and existing user breakpoints also wait for Next. Step mode uses debugger state rather than continuous profiling metrics.

## Create and edit code

In **Functions**, **OOP**, or **Files**, click **New entity** to create a file, folder, function, or class. Use the searchable folder/file browser on the left to choose the containing folder or source file. Set the name, entity type and scope across the top; write file contents or a function/class body in the code area below. Leave a declaration body blank to use the default scaffold. For a function, choose **Top level** or an existing class to create a method. Declaration scaffolds support JavaScript, TypeScript, and Python. In an entire-app map, owned new files and folders appear in Files view even without functions. OOP retains recognized empty classes inside the selected app/file scope.

Both code areas provide syntax coloring for JavaScript/TypeScript (including JSX/TSX), Python, and JSON/JSONC. Unknown languages remain plain text.

Click a pencil icon or double-click a function, class, or file node to open its source in a contextual drawer. The details inspector also provides pencil actions. Create, Save, and Close remain pinned while the drawer scrolls. Use **Save** for code changes and **Rename references** for a symbol name: the installed language provider supplies the refactor across supported references. Save source edits before renaming. Keep the declaration identifier in place in the source box and use the name field to change it. Parameter/body changes do not rewrite arguments or update other call sites automatically.

Creating an entity does not widen the opened map. Entire-app maps include resources owned by that app and exclude nested/sibling apps. File maps keep that file and reachable calls; function traces keep the selected function and its reachable calls. Unrelated entities are still saved and available in the creation hierarchy, and appear when you open their scope or connect them to the traced flow.

Edits, renames, and created code automatically save their affected files, including reference files changed by rename. Unrelated dirty files are left alone. Saving an affected document also saves any earlier unsaved edits in that same document. Failed saves preserve the applied buffer changes and report the files that still need saving. Normal text undo remains available. Maps rescan after authoring and mapped source changes, including provider name/range changes. **Refresh map** retries a stale or incomplete scan. Authoring requires a trusted local workspace and an idle debugger; Architecture is read-only. Existing files are never overwritten during creation. Conflicting document revisions are rejected instead of replacing newer edits. The hierarchy lists up to 600 entries and 200 class targets per chosen file.

## Watch live execution

Click **Run live** in a trusted workspace and choose the available file, application, or debug target. Install your application's dependencies and configure its runtime first.

- **Node.js:** function call counts, sampled CPU time, and captured application logs/errors.
- **Python:** function entries, approximate workspace self elapsed time, and print/logging/warning/error messages. Install the Python and Python Debugger extensions and select the appropriate interpreter.
- **React and Next.js:** launch a development-server script or an existing debug configuration. Browser debugging highlights paused/stepped frames when source maps resolve; it does not provide continuous browser call counts or browser log capture.

Runtime telemetry stays local and is bounded. Captured logs can contain text emitted by your application.

## Requirements and limitations

VS Code 1.85 or newer is required. Symbol and call detection depend on the installed language providers; Python projects need suitable Python language support such as Pylance. Framework packages must be installed in your project's environment.

The graph represents connections detected by language tools, rather than a guarantee of every possible runtime path. Dynamic calls and generated framework code may not resolve. Complexity labels are conservative estimates, and unsupported cases are shown as unknown.

Large repositories are scanned within limits: 500 application markers and 4,000 source files per workspace folder, 300 seeded files per application, and 300 graph nodes.

## Support and source

[Report an issue](https://github.com/Eliyas-Wubie/visualize_code/issues) or browse the [source and sample projects](https://github.com/Eliyas-Wubie/visualize_code). Licensed under [MIT](https://github.com/Eliyas-Wubie/visualize_code/blob/main/LICENSE).

## Develop locally

Clone the repository, install Node.js 24 and Python 3.12, run `npm ci`, and press **F5** in VS Code to open an Extension Development Host.

Run `npm run format:check`, `npm run lint`, `npm run check`, `npm test`, and `npm run build`. See the repository's [testing and delivery guide](https://github.com/Eliyas-Wubie/visualize_code/blob/main/dev_docs/07_testing_and_delivery.md) for verification details.

After building, run `npm run test:webview` for real browser checks of modal Close/Escape, repeated opening, delayed replies, and node details. It uses an isolated local Edge/Chromium profile and a synthetic host, with no project writes. Set `VISUALIZER_BROWSER_PATH` if the browser is not in a standard Windows location.
