import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClassChoices } from './useClassChoices';
import { HierarchyBrowser } from './HierarchyBrowser';
import { CreationProperties } from './CreationProperties';
import { CodeEditor } from './CodeEditor';
import { syntaxLanguage } from './syntax-tokens';

/** Compose a project browser, top properties and code body; only explicit submission requests a source write. */
export function CreateEntityForm({ authoring, mode, actionsNode }) {
  const { dialog, working, request } = authoring;
  const [kind, setKind] = useState(
    mode === 'files' ? 'file' : mode === 'oop' ? 'class' : 'function',
  );
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [body, setBody] = useState('');
  const scope = useClassChoices(kind, target, request);
  const location = dialog.entries.find((entry) => entry.id === target);
  const formId = useId();
  const submit = (
    <button
      className="button-primary"
      form={formId}
      disabled={working || !target || !name.trim()}
      type="submit"
    >
      Create {kind}
    </button>
  );
  return (
    <>
      <form
        id={formId}
        className="creation-workspace"
        onSubmit={(event) => {
          event.preventDefault();
          authoring.apply('create', {
            kind,
            name,
            target,
            parent: scope.parent,
            body: kind === 'folder' ? '' : body,
          });
        }}
      >
        <HierarchyBrowser
          entries={dialog.entries}
          kind={kind}
          target={target}
          choose={setTarget}
          disabled={working}
        />
        <div className="creation-editor">
          <CreationProperties
            kind={kind}
            setKind={(value) => {
              setKind(value);
              setTarget('');
            }}
            name={name}
            setName={setName}
            parent={scope.parent}
            setParent={scope.setParent}
            classes={scope.classes}
            location={location ? location.path || '(project root)' : ''}
            disabled={working}
          />
          {kind !== 'folder' ? (
            <div className="creation-body code-field">
              <span>
                {kind === 'file'
                  ? 'File contents'
                  : `${kind === 'class' ? 'Class' : 'Function'} body`}
              </span>
              <CodeEditor
                label={kind === 'file' ? 'File contents' : `${kind} body`}
                language={syntaxLanguage(kind === 'file' ? name : location?.path)}
                value={body}
                disabled={working}
                onChange={setBody}
                placeholder={
                  kind === 'file'
                    ? 'Write the file contents here'
                    : 'Write the body here. Leave blank for a scaffold.'
                }
              />
            </div>
          ) : (
            <p>Folders contain no source code.</p>
          )}
          {kind !== 'folder' && kind !== 'file' && (
            <p>
              Write body code, not the outer declaration. Indentation inside the body is preserved.
            </p>
          )}
          {dialog.limited && (
            <p>Hierarchy is limited to 600 entries. Some locations are omitted.</p>
          )}
          {scope.error && <p role="alert">{scope.error}</p>}
          {!actionsNode && submit}
        </div>
      </form>
      {actionsNode && createPortal(submit, actionsNode)}
    </>
  );
}
