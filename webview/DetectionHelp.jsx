import React from 'react';

/** Explain the current detection pipeline and its limits in a keyboard-accessible disclosure. */
export function DetectionHelp() {
  return (
    <details className="detection-help">
      <summary
        aria-label="How functions, classes, and calls are detected"
        title="How detection works"
      >
        ?
      </summary>
      <section className="help-content" aria-label="How detection works">
        <h2>How detection works</h2>
        <p>
          <strong>Applications explorer:</strong> The left Activity Bar icon discovers app roots
          from package.json, Python project/requirements files, and framework config filenames.
          Nested app roots own their own files. These are manifest-based candidates, not proof of
          independently deployed apps. Configurations are read as text and never executed. Refresh
          after changing the source layout.
        </p>
        <p>
          <strong>Whole-app maps:</strong> Click an app to collect functions from source files,
          including functions not reachable from any single entry point. Next.js page, layout, and
          route filenames and React App/main/index files are entry candidates. JSX component
          references resolved by the language provider become “renders” links. Framework routing,
          dynamic imports, and runtime-only links may be missing; the map does not invent them.
        </p>
        <p>
          <strong>Python:</strong> Functions, methods, classes, documentation, diagnostics, and call
          edges use the installed Python language provider (for example Pylance). Missing call
          support is labeled explicitly. Run live supports Python files and Python launch
          configurations through Python Debugger. Python Big-O is not yet supported.
        </p>
        <p>
          <strong>Starting point:</strong> Your selected function is resolved using VS Code’s call
          hierarchy. The function picker uses the active file’s document symbols. App/file maps
          prefer a top-level main function when one is available; this is a convention, not proof of
          the runtime entry. Cursor traces retain your selected function.
        </p>
        <p>
          <strong>Functions and calls:</strong> The extension asks your installed language extension
          for each function’s outgoing calls, then follows the returned functions across files.
          Arrows point from caller to callee. Shared functions appear once; recursive calls remain
          connected.
        </p>
        <p>
          <strong>Classes:</strong> Document symbols identify the class whose source range contains
          a discovered function. Function mode labels these as ClassName.method. OOP mode groups
          them into class nodes and combines calls between their methods. Calls within a class form
          a loop.
        </p>
        <p>
          <strong>OOP scope:</strong> Only classes reached by the discovered flow appear, with their
          discovered methods. Standalone functions and their connections are hidden. Inheritance,
          fields, and object creation alone are not separately analyzed as relationships.
        </p>
        <p>
          <strong>Parameters and files:</strong> Filenames come from source locations. Parameters
          are read from declaration text using a lightweight scanner for common syntax. Unsupported
          or unreadable declarations show “Parameters unavailable.”
        </p>
        <p>
          <strong>Missing connections:</strong> Results depend on your language extension and its
          type information. Dynamic calls, callbacks, reflection, and untyped parameters may be
          unresolved. For example, if Library.borrow’s member parameter has no known Member type,
          calls to member.canBorrow may be missing. A disconnected class does not prove it is
          unused.
        </p>
        <p>
          <strong>Live debugging:</strong> While a debugger is paused or stepping, known functions
          on its call stack are highlighted. The top mapped frame is labeled “Paused here.” Running
          clears these highlights. Stack source locations must match this map; source maps and
          unknown functions may limit coverage.
        </p>
        <p>
          <strong>Run live:</strong> Files run with their supported runtime. App maps offer
          development server scripts, entry files, browser debugging, and existing launch
          configurations. React and Next.js pages are launched through their app rather than
          executed as standalone Node scripts. Use Run live again to add a browser debugger while a
          development server is running.
        </p>
        <p>
          <strong>Node.js metrics:</strong> A local profiling preload collects V8 precise coverage;
          timings are sampled self CPU time, not elapsed call duration. Updates arrive roughly every
          half second when the event loop is available, plus a final update on normal exit. Busy
          synchronous work delays updates. Class metrics sum their discovered methods. Use VS Code’s
          Stop button to end the run.
        </p>
        <p>
          <strong>Python metrics:</strong> A local runner records frame entries and elapsed time
          excluding nested workspace Python frames; external-library and waiting time can remain
          included. Coroutine/generator resumes count as additional entries. Print, logging,
          warnings, and uncaught errors are captured. Python 3.10+ and the Python Debugger extension
          are required.
        </p>
        <p>
          <strong>Browser and framework limits:</strong> Browser and other debugger-only targets
          provide source-mapped paused-stack highlighting, not continuous call counts or log
          capture. Framework server metrics depend on generated code matching mapped sources. Start
          a dev server before opening its browser debugger, and use existing launch configurations
          for custom framework setup.
        </p>
        <p>
          <strong>Runtime scope:</strong> Built-in profiling supports Node.js .js/.cjs/.mjs and
          Python .py entry files. Workers, child processes, and forced exits may have incomplete
          data. Profiling adds overhead. Data travels over a local IPC connection. Console messages,
          warnings, and uncaught errors are captured locally, up to 500 messages per run (4,000
          characters each). Normal logs stay in memory; a fatal error uses one temporary crash
          record, read and removed when the run ends. Logs contain whatever the application writes;
          function arguments and return values are not separately collected. Calls between functions
          are highlighted from paused stacks, not inferred from coverage counts.
        </p>
        <p>
          <strong>Limits:</strong> The base map is static analysis, not recorded execution or
          guaranteed runtime order. Cursor maps follow reachable functions; app maps seed up to 300
          source files, with calls limited to that app. Workspace discovery is capped at 500 markers
          and 4,000 source files per folder. Discovery stops at 300 functions and can be paused;
          omitted calls are marked. Static discovery does not execute code. Live runs execute your
          selected file only when requested. This extension does not upload trace data.
        </p>
        <p>
          <strong>Node details and colors:</strong> Click a node for its signature, file, runtime
          metrics, VS Code diagnostics, and captured logs. Red means an associated error; amber
          means a warning. Class nodes combine their discovered methods’ messages and class
          diagnostics. Runtime messages use source stack locations; messages without a known
          function are not guessed onto a node. Captured logs require live Node.js/Python profiling;
          debugger-only sessions provide stack highlights.
        </p>
        <p className="help-dismiss">Click ? again to close.</p>
        <p>
          <strong>Big-O badges:</strong> ~O(1), ~O(n), and ~O(n^2) estimate local
          JavaScript/TypeScript loop nesting only, assuming each loop traverses n items. Called
          functions, library operations, I/O, and actual input-dependent bounds are excluded. These
          are not total runtime guarantees. Recursion and unsupported syntax show Unknown. Hover a
          badge for its assumptions.
        </p>
      </section>
    </details>
  );
}
