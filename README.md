<video src="https://github.com/Eliyas-Wubie/visualize_code/raw/refs/heads/main/media/extention_demo.mp4" controls autoplay muted loop playsinline width="100%" aria-label="Code Execution Visualizer demo"></video>

# Code Execution Visualizer

Explore your code as a connected, top-to-bottom map of functions and classes. Discover separate applications in a repository, inspect function details, and follow supported live execution activity.

## Get started

1. Install **Code Execution Visualizer** in VS Code and open your project folder.
2. Click **Visualize Code** in the left Activity Bar.
3. Select an application or listed file to open its map.
4. Switch between **Functions** and **OOP** to explore functions or classes. Use the minimap and zoom/pan controls to navigate.
5. Click a node to inspect its parameters, file, documentation, diagnostics, and available runtime logs.

To start from one function, place the cursor inside it and run **Visualize Code: Trace from Cursor** from the Command Palette. You can also run **Visualize Code: Choose Starting Function**.

## Explore the map

- **Function maps:** connected functions and class methods, with names such as `ClassName.method`.
- **Class maps:** switch to OOP mode to explore relationships between classes.
- **Node details:** parameters, source file, available documentation, warnings, errors, and estimated Big-O complexity when supported.
- **Navigation:** a clickable minimap, adjustable zoom/pan sensitivity, and separate tabs named after the selected starting point.
- **Application discovery:** find separate JavaScript/TypeScript, React, Next.js, and Python applications within a repository.

Click **?** in the visualizer for details about how symbols and connections are detected.

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
