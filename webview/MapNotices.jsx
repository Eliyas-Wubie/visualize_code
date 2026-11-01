import React from 'react';

/** Explain the selected scan scope and its partial/empty results without changing discovery state. */
export function MapNotices({ graph, mode, count }) {
  return (
    <>
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
