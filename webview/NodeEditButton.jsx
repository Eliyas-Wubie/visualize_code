import React from 'react';
import { Icon } from './Icon';

/** Open the actual node source without also selecting/dragging the card; read-only views supply no edit callback. */
export function NodeEditButton({ data }) {
  if (!data.edit) return null;
  return (
    <button
      type="button"
      className="node-edit nodrag"
      disabled={data.busy}
      aria-label={`Edit ${data.displayName || data.name} code`}
      title={`Edit ${data.displayName || data.name} code`}
      onClick={(event) => {
        event.stopPropagation();
        data.edit(data.editId || data.hostId);
      }}
    >
      <Icon name="edit" size={15} />
    </button>
  );
}
