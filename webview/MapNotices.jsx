import React from 'react';

/** Explain the selected scan scope and its partial/empty results without changing discovery state. */
export function MapNotices({ graph, mode, count, refresh }) {
  return (
    <>
      {!count && graph.limit && mode !== 'oop' && !graph.error && (
        <section className="empty-state" aria-label="Empty map">
          <strong>No mapped code in this scope</strong>
          <p>
            Choose a starting point in Visualize Code, or refresh after language support is ready.
          </p>
          <button onClick={refresh}>Refresh map</button>
        </section>
      )}
      {mode === 'files' && (
        <p className="app-context">
          Areas are containing folders; nodes include mapped files and the bounded authoring
          hierarchy. Arrows summarize detected calls and renders, including internal file loops.
          Empty files and folders have no inferred dependencies. Imports are not inferred.
        </p>
      )}
      {graph.app && (
        <p className="app-context">
          {graph.app.framework} /{' '}
          {graph.app.selectedFile ? `From file: ${graph.app.selectedFile}` : 'App-wide map'}. Calls
          outside this app are excluded.
        </p>
      )}
      {graph.warnings?.length > 0 && (
        <details className="scan-warnings">
          <summary>Scan notices ({graph.warnings.length})</summary>
          {graph.warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </details>
      )}
      {mode === 'oop' && !count && (
        <p className="empty-state">
          No classes found in the discovered flow. Trace a class method or an entry point that calls
          class methods.
        </p>
      )}
    </>
  );
}
