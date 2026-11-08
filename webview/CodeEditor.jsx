import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { syntaxTokens } from './syntax-tokens';
import { syncCodeViewport } from './code-viewport';

/** Overlay escaped lexical colors under a native textarea; input, selection, caret and scrolling retain normal browser behavior. */
export function CodeEditor({
  value,
  onChange,
  language = 'plaintext',
  disabled,
  placeholder,
  label,
}) {
  const mirror = useRef();
  const input = useRef();
  const synchronize = useCallback(() => syncCodeViewport(input.current, mirror.current), []);
  const tokens = useMemo(() => syntaxTokens(value, language), [value, language]);
  useLayoutEffect(() => {
    synchronize();
  }, [value, synchronize]);
  // ResizeObserver keeps both viewports aligned when native scrollbars or textarea resizing change usable space.
  useLayoutEffect(() => {
    const observer = new ResizeObserver(synchronize);
    observer.observe(input.current);
    return () => observer.disconnect();
  }, [synchronize]);
  return (
    <div className="syntax-editor" data-language={language}>
      <pre ref={mirror} aria-hidden="true">
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={`syntax-${token.type}`}>
              {token.text}
            </span>
          ))}
          {value.endsWith('\n') ? ' ' : ''}
        </code>
      </pre>
      <textarea
        ref={input}
        rows={18}
        wrap="off"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={label}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onScroll={synchronize}
      />
    </div>
  );
}
