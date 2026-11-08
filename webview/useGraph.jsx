import { useCallback, useEffect, useRef, useState } from 'react';
import { liveSupportError } from './liveSupport';

import { postMessage } from './host-api';

/** Receive host snapshots and discover reachable calls sequentially; errors pause for retry. */
export function useGraph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState({ message: 'Preparing code map…' });
  const [live, setLive] = useState({ status: 'Not running', metrics: {}, active: [], edges: [] });
  const [diagnostics, setDiagnostics] = useState({ functions: {}, classes: {} });
  const latest = useRef(graph);
  const automatic = useRef(true);
  const pending = useRef(false);
  const launchTimer = useRef();
  const request = useCallback((id) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    postMessage({ type: 'expand', id });
  }, []);
  const follow = useCallback(
    (id) => {
      automatic.current = false;
      request(id);
    },
    [request],
  );
  const open = useCallback((id) => postMessage({ type: 'open', id }), []);
  const stop = useCallback(() => {
    automatic.current = false;
  }, []);
  useEffect(() => {
    const receive = (event) => {
      if (event.data?.type === 'loading') {
        setLoading(event.data.status === 'ready' ? undefined : event.data);
        return;
      }
      if (event.data?.type === 'diagnostics') {
        setDiagnostics(event.data);
        return;
      }
      if (event.data?.type === 'live') {
        clearTimeout(launchTimer.current);
        setLive(event.data);
        return;
      }
      if (event.data?.type !== 'graph') return;
      const next = event.data;
      latest.current = next;
      pending.current = false;
      setBusy(false);
      setGraph(next);
      setLoading(undefined);
      if (next.error) automatic.current = false;
      const unloaded = next.nodes.find((node) => !node.loaded);
      if (automatic.current && unloaded) request(unloaded.id);
    };
    window.addEventListener('message', receive);
    postMessage({ type: 'ready' });
    return () => {
      window.removeEventListener('message', receive);
      clearTimeout(launchTimer.current);
    };
  }, [request]);
  return {
    graph,
    loading,
    retryLoad: () => {
      setLoading({ message: 'Preparing code map…' });
      postMessage({ type: 'retryLoad' });
    },
    cancelLoad: () => postMessage({ type: 'cancelLoad' }),
    refresh: () => postMessage({ type: 'refresh' }),
    busy,
    live,
    diagnostics,
    nextStep: () => postMessage({ type: 'nextStep' }),
    stopStep: () => postMessage({ type: 'stopStep' }),
    startLive: (step = false) => {
      const error = liveSupportError(latest.current);
      if (error) {
        setLive((previous) => ({ ...previous, status: error }));
        return;
      }
      setLive((previous) => ({ ...previous, status: 'Requesting live run...' }));
      clearTimeout(launchTimer.current);
      launchTimer.current = setTimeout(
        () =>
          setLive((previous) => ({
            ...previous,
            status: 'No launch response. Restart Extension Development Host and try again.',
          })),
        10000,
      );
      postMessage({ type: step === true ? 'startStep' : 'startLive' });
    },
    discover: () => {
      automatic.current = true;
      const next = latest.current.nodes.find((node) => !node.loaded);
      if (next) request(next.id);
    },
    stop,
    follow,
    open,
  };
}
