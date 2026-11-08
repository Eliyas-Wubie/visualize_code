import React, { useEffect, useRef, useState } from 'react';
import { CreateEntityForm } from './CreateEntityForm';
import { SourceEditForm } from './SourceEditForm';

/** Show an accessible source-authoring panel with explicit apply actions; architecture mode has no authoring controls. */
export function AuthoringDialog({ authoring, mode }) {
  const heading = useRef();
  const [actionsNode, setActionsNode] = useState();
  useEffect(() => {
    heading.current?.focus();
  }, [authoring.dialog]);
  if (mode === 'architecture') return null;
  return (
    <>
      {authoring.status && (
        <p className="authoring-status" role="status">
          {authoring.status}
        </p>
      )}
      {authoring.dialog && (
        <aside
          className="authoring-dialog nodrag nowheel"
          data-kind={authoring.dialog.type}
          role="dialog"
          aria-modal="false"
          aria-label="Source authoring"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              authoring.close();
            }
          }}
        >
          <div className="details-heading dialog-header">
            <h2 ref={heading} tabIndex={-1}>
              {authoring.dialog.type === 'create'
                ? 'Create entity'
                : `Edit ${authoring.dialog.name}`}
            </h2>
            <div className="details-actions">
              <span className="dialog-actions-slot" ref={setActionsNode} />
              <button
                type="button"
                aria-label="Close source editor"
                onClick={(event) => {
                  event.stopPropagation();
                  authoring.close();
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div className="dialog-body">
            {authoring.dialog.type === 'create' ? (
              <CreateEntityForm authoring={authoring} mode={mode} actionsNode={actionsNode} />
            ) : (
              <SourceEditForm
                key={authoring.dialog.token}
                authoring={authoring}
                actionsNode={actionsNode}
              />
            )}
            {authoring.status && <p role="alert">{authoring.status}</p>}
            {authoring.working && <p role="status">Applying workspace change…</p>}
          </div>
        </aside>
      )}
    </>
  );
}
