import React from 'react';

/** Render labeled sliders for independent zoom and pan speed multipliers. */
export function Sensitivity({ navigation }) {
  return (
    <div className="sensitivity">
      <label>
        Zoom {navigation.zoomSpeed.toFixed(1)}x
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.1"
          value={navigation.zoomSpeed}
          onChange={(event) => navigation.setZoomSpeed(Number(event.target.value))}
        />
      </label>
      <label>
        Pan {navigation.panSpeed.toFixed(1)}x
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.1"
          value={navigation.panSpeed}
          onChange={(event) => navigation.setPanSpeed(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
