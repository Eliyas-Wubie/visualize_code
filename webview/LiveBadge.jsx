import React from 'react';

/** Label observed execution and sampled self CPU time; omit metrics that were not observed. */
export function LiveBadge({ data }) {
  return (
    <div className="node-runtime">
      {data.visited && !data.active && <div className="live-stack">Visited</div>}
      {data.active && (
        <div className="live-stack">{data.current ? 'Paused here' : 'On call stack'}</div>
      )}
      {data.live && (
        <div className="live-metrics">
          {data.live.calls} {data.live.countLabel || 'calls'} / {data.live.cpuMs.toFixed(2)} ms{' '}
          {data.live.timing || 'sampled CPU'}
        </div>
      )}
    </div>
  );
}
