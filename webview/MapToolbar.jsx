import React from 'react';
import { Sensitivity } from './Sensitivity';

/** Present map actions and discovery status; callbacks retain execution authority in the host. */
export function MapToolbar({
  graph,
  live,
  busy,
  remaining,
  startLive,
  discover,
  stop,
  fit,
  arrange,
  navigation,
}) {
  return (
    <nav aria-label="Map controls">
      <button
        onClick={startLive}
        title="Run this file or choose the app's server, browser, or debugger launch target"
      >
        Run live
      </button>
      <span role="status">{live.status}</span>
      <button onClick={discover} disabled={busy || !remaining}>
        Discover all calls
      </button>
      <button onClick={stop} disabled={!busy}>
        Pause
      </button>
      <button onClick={fit}>Fit map</button>
      <button onClick={arrange}>Auto arrange</button>
      <span role="status">
        {graph.error ||
          (busy
            ? 'Discovering connections...'
            : remaining
              ? 'Discovery paused'
              : 'All reachable calls mapped')}
      </span>
      <Sensitivity navigation={navigation} />
    </nav>
  );
}
