import { useCallback, useEffect, useRef } from 'react';
import { postMessage } from './host-api';

/** Correlate bounded authoring requests with host replies; reject outstanding promises when the webview closes. */
export function useAuthoringRequests(mode) {
  const pending = useRef(new Map());
  const sequence = useRef(0);
  useEffect(() => {
    const requests = pending.current;
    const receive = (event) => {
      if (event.data?.type !== 'editorResult') return;
      const item = requests.get(event.data.requestId);
      if (!item) return;
      clearTimeout(item.timer);
      requests.delete(event.data.requestId);
      if (event.data.error) item.reject(new Error(event.data.error));
      else item.resolve(event.data.result);
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      requests.forEach((item) => {
        clearTimeout(item.timer);
        item.reject(new Error('Editor closed.'));
      });
      requests.clear();
    };
  }, []);
  const request = useCallback(
    (action, values = {}) =>
      new Promise((resolve, reject) => {
        const requestId = `author:${++sequence.current}`;
        const timer = setTimeout(() => {
          pending.current.delete(requestId);
          reject(
            new Error(
              'No authoring response yet; the change may have applied. Refresh the map before retrying.',
            ),
          );
        }, 30000);
        pending.current.set(requestId, { resolve, reject, timer });
        postMessage({ ...values, type: 'editorRequest', action, mode, requestId });
      }),
    [mode],
  );
  return request;
}
