import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { CodeEditor } from './CodeEditor';
import { syntaxLanguage } from './syntax-tokens';

/** Edit declaration/file source or invoke semantic rename separately so unsaved text never conflicts with provider reference edits. */
export function SourceEditForm({ authoring, actionsNode }) {
  const { dialog, working } = authoring;
  const [source, setSource] = useState(dialog.source);
  const [name, setName] = useState(dialog.name);
  const changed = source !== dialog.source;
  const formId = useId();
  const save = (
    <button
      className="dialog-save"
      form={formId}
      disabled={working || !changed}
      type="submit"
      title="Save source changes"
    >
      Save
    </button>
  );
  return (
    <>
      <button disabled={working} onClick={() => authoring.edit(dialog.id)}>
        Reload source
      </button>
      {!dialog.file && (
        <div className="rename-controls">
          <label>
            Symbol name
            <input
              value={name}
              disabled={working}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button
            disabled={working || changed || name === dialog.name || !name}
            onClick={() => authoring.apply('rename', { token: dialog.token, name })}
          >
            Rename references
          </button>
        </div>
      )}
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          authoring.apply('save', { token: dialog.token, source });
        }}
      >
        <div className="code-field">
          <span>{dialog.file ? 'File source' : 'Declaration source'}</span>
          <CodeEditor
            label={dialog.file ? 'File source' : 'Declaration source'}
            language={dialog.language || syntaxLanguage(dialog.name)}
            value={source}
            disabled={working}
            onChange={setSource}
          />
        </div>
        <p>
          Use Rename references for symbol identity changes. Save source edits before renaming.
          Parameter/body edits do not rewrite arguments or other call sites.
        </p>
        {!dialog.file && (
          <p>
            Keep the declaration identifier in its original position in this source box; change its
            name through the field above.
          </p>
        )}
        {!actionsNode && save}
      </form>
      {actionsNode && createPortal(save, actionsNode)}
    </>
  );
}
