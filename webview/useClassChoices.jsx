import { useEffect, useState } from 'react';

/** Load authoritative class choices for the selected file and ignore replies after the selection changes. */
export function useClassChoices(kind, target, request) {
  const [parent, setParent] = useState('');
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setClasses([]);
    setParent('');
    setError('');
    if (kind === 'function' && target)
      request('classes', { target })
        .then((data) => {
          if (current) {
            setClasses(data.classes);
            if (data.limited) setError('Only the first 200 classes are listed.');
          }
        })
        .catch((failure) => {
          if (current) setError(failure.message);
        });
    return () => {
      current = false;
    };
  }, [kind, target, request]);
  return { parent, setParent, classes, error };
}
