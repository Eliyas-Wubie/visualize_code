import React, { useMemo, useState } from 'react';
import { hierarchyModel, filterHierarchy } from './hierarchy-model';
import { Icon } from './Icon';

/** Render a collapsible native folder/file browser with keyboard-operable target buttons and exact host IDs. */
export function HierarchyBrowser({ entries, kind, target, choose, disabled }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterHierarchy(entries, query), [entries, query]);
  const root = useMemo(() => hierarchyModel(filtered), [filtered]);
  const source = ['function', 'class'].includes(kind);
  const selectable = (node) =>
    node.id &&
    (source
      ? node.kind === 'file' &&
        ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py'].includes(node.path.split('.').pop())
      : node.kind === 'folder');
  const branch = (node) => {
    const button = (
      <button
        type="button"
        disabled={disabled || !selectable(node)}
        aria-pressed={node.id === target}
        aria-label={`Select ${node.kind} ${node.path || 'project root'}`}
        title={node.path || 'Project root'}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          choose(node.id);
        }}
      >
        {node.kind !== 'folder' && <Icon name="file" size={12} />}
        {node.kind === 'folder' ? 'Select' : node.name}
      </button>
    );
    return (
      <li key={node.path}>
        {node.kind === 'folder' ? (
          <details open>
            <summary>
              <span className="hierarchy-label">
                <Icon name="folder" size={12} />
                {node.name}
              </span>
              {button}
            </summary>
            <ul>
              {[...node.children.values()]
                .sort((a, b) =>
                  a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1,
                )
                .map(branch)}
            </ul>
          </details>
        ) : (
          button
        )}
      </li>
    );
  };
  return (
    <aside className="hierarchy-browser" aria-label="Project hierarchy">
      <h3>Location</h3>
      <p>{source ? 'Select a source file' : 'Select a containing folder'}</p>
      <input
        type="search"
        aria-label="Search creation locations"
        placeholder="Search locations..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        disabled={disabled}
      />
      {query && !filtered.some((entry) => entry.path) && (
        <p role="status">No matching locations.</p>
      )}
      <ul>{branch(root)}</ul>
    </aside>
  );
}
