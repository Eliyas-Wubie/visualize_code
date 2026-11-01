# Project Execution Visualizer

A VS Code extension that maps functions, class methods, and their connections across a project.

## Try it locally

1. Install Node.js 24 and Python 3.12, then run npm ci in this folder.
2. Open this repository in VS Code and press F5. The build runs automatically and opens Extension Development Host.
3. In that new window, open a project folder. Click the Visualize Code Activity Bar icon, then select an application or listed file.
4. Alternatively, put the cursor on a function name and run Visualize Code: Trace from Cursor from the Command Palette.
5. Restart the development host after changing extension code; an existing host may retain old modules.

## What the map shows

Functions mode displays functions and ClassName.method labels. OOP mode groups discovered methods by class. Pan/zoom, a navigable minimap, node details, existing documentation, diagnostics, logs, and estimated local Big-O are available. Click ? in the map for detection rules and limitations.

React and Next.js apps are identified from package/configuration files; resolved JSX references add renders links. Python symbols and calls depend on installed language support such as Pylance. Discovery is bounded: 500 app markers and 4,000 source files per workspace folder, 300 seeded files per app, and 300 retained graph nodes. Missing provider support is reported.

## Live execution

Run live explicitly executes a file or a chosen app target in a trusted workspace. Node.js records V8 call counts and sampled CPU time. Python records frame entries and approximate workspace self elapsed time, plus print/logging/warning/error messages. Python requires Python Debugger; framework packages must already exist in the project's chosen environment.

React/Next.js app maps offer dev-server scripts, browser debugging, and existing launch configurations. A browser debugger can be added while the server runs. Browser-only targets highlight source-mapped paused/stepped frames; they do not provide continuous browser call counts or log capture. Generated framework code may not match source nodes.

Logs stay local and are bounded. One fatal Node.js error can use a temporary record that is read and removed at session end. Do not use real credentials or private data in samples or tests.

## Samples and checks

- sample/main.js: cross-file function calls, branching, recursion.
- sample/oop.js and sample/library/main.js: class-based examples.
- sample/live.js: timed Node.js workload.
- sample/logs.js: synthetic warnings and handled errors.
- sample/python/main.py: Python metrics and logs.
- sample/python/errors.py: intentional fatal Python error.

Use npm run format:check, npm run lint, npm run check, npm test, and npm run build. See [testing and delivery](dev_docs/07_testing_and_delivery.md) for exact commands, CI, and current verification gaps, and [maintenance standards](dev_docs/08_maintenance_and_standards.md) for the source review and known development-tool advisories.
