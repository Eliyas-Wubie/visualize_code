/** Scale wheel zoom around the cursor, preserving its graph position and clamping zoom. */
function zoomAt(view, point, delta, sensitivity) {
  const zoom = Math.min(2, Math.max(0.05, view.zoom * Math.exp(-delta * 0.002 * sensitivity)));
  const scale = zoom / view.zoom;
  return { zoom, x: point.x - (point.x - view.x) * scale, y: point.y - (point.y - view.y) * scale };
}

/** Apply screen-space pan deltas scaled by the chosen sensitivity. */
function panBy(view, x, y, sensitivity) {
  return { ...view, x: view.x + x * sensitivity, y: view.y + y * sensitivity };
}

module.exports = { zoomAt, panBy };
