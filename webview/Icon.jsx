import React from 'react';

const paths = {
  flow: 'M5 3h5v5H5zM14 16h5v5h-5zM5 8v8a3 3 0 0 0 3 3h6M10 5h6a3 3 0 0 1 3 3v3',
  play: 'm8 5 11 7-11 7V5Z',
  step: 'm5 5 9 7-9 7V5ZM19 5v14',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 6.1a8 8 0 0 1 13 2M4.9 15.9a8 8 0 0 0 13 2',
  fit: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M8 8h8v8H8z',
  layout: 'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
  settings: 'M4 6h7M15 6h5M4 12h2M10 12h10M4 18h10M18 18h2M11 3v6M6 9v6M14 15v6',
  function: 'm8 5-5 7 5 7M16 5l5 7-5 7M14 4l-4 16',
  class: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9',
  file: 'M14 3H5v18h14V8l-5-5ZM14 3v6h5M8 13h8M8 17h5',
  folder: 'M3 6h7l2 3h9v12H3V6Z',
  edit: 'm16 3 5 5-13 13H3v-5L16 3ZM14 5l5 5',
  stop: 'M6 6h12v12H6z',
};

/** Render a decorative, consistent stroke icon; the surrounding control supplies its accessible name. */
export function Icon({ name, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.flow} />
    </svg>
  );
}
