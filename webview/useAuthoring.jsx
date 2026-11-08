import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthoringRequests } from './useAuthoringRequests';

/** Correlate authoring requests and own dialog state; host errors remain explicit and source changes require a user action. */
export function useAuthoring(mode, stop) {
  const [dialog, setDialog] = useState();
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('');
  const generation = useRef(0);
  const running = useRef(false);
  const request = useAuthoringRequests(mode);
  useEffect(() => {
    generation.current++;
    setDialog(undefined);
    setStatus('');
  }, [mode]);
  const run = useCallback(
    async (action, values, completed) => {
      if (running.current) return;
      running.current = true;
      const current = generation.current;
      setWorking(true);
      setStatus('');
      stop();
      try {
        const result = await request(action, values);
        if (current === generation.current) completed(result);
        else if (result.applied)
          setStatus(
            result.warning ||
              (result.saved ? 'Submitted change saved.' : 'Submitted change applied.'),
          );
      } catch (error) {
        setStatus(error.message);
      } finally {
        running.current = false;
        setWorking(false);
      }
    },
    [request, stop],
  );
  const create = useCallback(
    () => run('catalog', {}, (data) => setDialog({ type: 'create', ...data })),
    [run],
  );
  const edit = useCallback(
    (id) => run('load', { id }, (data) => setDialog({ type: 'edit', id, ...data })),
    [run],
  );
  const apply = useCallback(
    (action, values) =>
      run(action, values, (data) => {
        setDialog(undefined);
        setStatus(data.warning || (data.saved ? 'Changes saved.' : 'Change applied.'));
      }),
    [run],
  );
  return {
    dialog,
    working,
    status,
    request,
    close: () => {
      generation.current++;
      setDialog(undefined);
      setStatus(
        working ? 'Editor closed. Any already submitted workspace change will continue.' : '',
      );
    },
    create,
    edit,
    apply,
  };
}
