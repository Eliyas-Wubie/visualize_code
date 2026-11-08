import React from 'react';

/** Present creation metadata above the code body; location remains controlled by the hierarchy browser. */
export function CreationProperties({
  kind,
  setKind,
  name,
  setName,
  parent,
  setParent,
  classes,
  location,
  disabled,
}) {
  return (
    <div className="creation-properties">
      <label>
        Entity
        <select value={kind} disabled={disabled} onChange={(event) => setKind(event.target.value)}>
          {['file', 'folder', 'function', 'class'].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label>
        Name
        <input
          required
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {kind === 'function' && (
        <label>
          Scope
          <select
            value={parent}
            disabled={disabled}
            onChange={(event) => setParent(event.target.value)}
          >
            <option value="">Top level</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} / method
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="creation-location">
        Selected location
        <input readOnly value={location || 'Choose in the hierarchy on the left'} />
      </label>
    </div>
  );
}
