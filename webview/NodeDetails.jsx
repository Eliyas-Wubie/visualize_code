import React, { useEffect, useRef } from 'react';
import { ComplexityBadge } from './ComplexityBadge';

/** Display current node metadata, diagnostics, and bounded local runtime logs in a modeless panel. */
export function NodeDetails({ data, close, live }) {
  const dismiss = useRef();
  useEffect(() => {
    dismiss.current?.focus();
  }, [data.hostId]);
  return (
    <aside
      className="node-details"
      role="dialog"
      aria-modal="false"
      aria-label="Node details"
      onKeyDown={(event) => {
        if (event.key === 'Escape') close();
      }}
    >
      <div className="details-heading">
        <h2>{data.displayName || data.name}</h2>
        <button ref={dismiss} onClick={close} aria-label="Close node details">
          ×
        </button>
      </div>
      <p>
        {data.methods ? 'Class' : 'Function'}
        {data.className && ` / Class: ${data.className}`}
      </p>
      <p className="details-path">
        {data.file}:{data.line}
      </p>
      {data.callSupport && <p className="warning">{data.callSupport}</p>}
      {data.parameters != null && <pre>{data.parameters}</pre>}
      {!data.methods && (
        <>
          <h3>Estimated local complexity</h3>
          <ComplexityBadge complexity={data.complexity} />
          <p>{data.complexity?.reason}</p>
        </>
      )}
      <button onClick={() => data.open(data.hostId)}>Open source</button>
      {!data.methods && (
        <>
          <h3>Documentation</h3>
          {data.documentation ? (
            <pre>{data.documentation}</pre>
          ) : (
            <p>
              {data.documentationError || 'No documentation provided by the language extension.'}
            </p>
          )}
        </>
      )}
      {data.methods && (
        <>
          <h3>Discovered methods</h3>
          {data.methods.map((method) => (
            <div key={method.id}>
              <button className="method" onClick={() => data.open(method.id)}>
                {method.name}
                {method.parameters ?? ' (parameters unavailable)'}
              </button>
              {method.documentation && <pre>{method.documentation}</pre>}
            </div>
          ))}
        </>
      )}
      <h3>Runtime</h3>
      <p>
        {data.live
          ? `${data.live.calls} ${data.live.countLabel || 'calls'} / ${data.live.cpuMs.toFixed(2)} ms ${data.live.timing || 'sampled CPU'}`
          : live.profileMode === 'debugger'
            ? 'Debugger mode: stack highlights on pause; continuous metrics are unavailable for this target.'
            : 'No runtime metrics recorded for this node.'}
      </p>
      <h3>Diagnostics ({data.diagnostics?.length || 0})</h3>
      {data.diagnostics?.length ? (
        data.diagnostics.map((entry, index) => (
          <div key={index} className={`detail-entry ${entry.level}`}>
            <strong>{entry.level.toUpperCase()}</strong> · {entry.source} · line {entry.line}
            <pre>{entry.text}</pre>
          </div>
        ))
      ) : (
        <p>No diagnostics reported for this node.</p>
      )}
      <h3>Logs and runtime errors ({data.logs?.length || 0})</h3>
      <p className="details-hint">
        Captured during live Node.js/Python profiling, up to 500 messages per run. Values are
        whatever your application logged.
      </p>
      {live.logError && <p className="warning">{live.logError}</p>}
      {data.logs?.length ? (
        data.logs.map((entry, index) => (
          <div key={index} className={`detail-entry ${entry.level}`}>
            <strong>{entry.level.toUpperCase()}</strong> ·{' '}
            {new Date(entry.time).toLocaleTimeString()} · line {entry.position.line + 1}
            <pre>{entry.text}</pre>
          </div>
        ))
      ) : (
        <p>No captured logs associated with this node.</p>
      )}
      {live.unmatchedLogs?.length > 0 && (
        <p className="details-hint">
          {live.unmatchedLogs.length} run messages could not be assigned to a mapped function.
        </p>
      )}
    </aside>
  );
}
