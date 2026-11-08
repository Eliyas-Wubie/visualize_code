import React from 'react';
import { Icon } from './Icon';

/** Present map actions and discovery status; callbacks retain execution authority in the host. */
export function MapToolbar({
  graph,
  live,
  busy,
  remaining,
  startLive,
  discover,
  stop,
  authoring,
  refresh,
}) {
  return (
    <nav aria-label="Map controls">
      <div className="action-group" role="group" aria-label="Execution actions">
        <button
          className="button-primary"
          onClick={() => startLive()}
          title="Run this file or choose the app's server, browser, or debugger launch target"
        >
          <Icon name="play" />
          Run live
        </button>
        <button
          onClick={() => startLive(true)}
          disabled={busy || !graph.nodes.length}
          title="Pause at mapped function entries; use Next below to advance"
        >
          <Icon name="step" />
          Step run
        </button>
      </div>
      <span role="status" className="runtime-status" title={live.status}>
        {live.status}
      </span>
      <div className="action-group discovery-actions" role="group" aria-label="Discovery actions">
        <button onClick={discover} disabled={busy || !remaining}>
          Discover all calls
        </button>
        <button onClick={stop} disabled={!busy}>
          Pause
        </button>
      </div>
      <button onClick={refresh} disabled={busy || authoring?.working}>
        <Icon name="refresh" />
        Refresh map
      </button>
      {authoring && (
        <button disabled={busy || authoring.working} onClick={authoring.create}>
          <Icon name="plus" />
          New entity
        </button>
      )}
      <span role="status" className="discovery-status">
        {graph.error ||
          (busy
            ? 'Discovering connections...'
            : remaining
              ? 'Discovery paused'
              : 'All reachable calls mapped')}
      </span>
    </nav>
  );
}
