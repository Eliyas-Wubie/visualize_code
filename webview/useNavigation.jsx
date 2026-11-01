import { useEffect, useRef, useState } from 'react';
import { zoomAt, panBy } from './navigation';

/** Supply adjustable cursor-anchored wheel zoom and canvas drag/Shift-wheel panning. */
export function useNavigation(instance) {
  const canvas = useRef();
  const drag = useRef();
  const [zoomSpeed, setZoomSpeed] = useState(1);
  const [panSpeed, setPanSpeed] = useState(1);
  useEffect(() => {
    const element = canvas.current;
    if (!instance || !element) return;
    const wheel = (event) => {
      if (
        event.target.closest('.react-flow__minimap, .react-flow__controls, .node-details, .nowheel')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const view = instance.getViewport();
      const delta = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      if (event.shiftKey && !event.ctrlKey) {
        instance.setViewport(panBy(view, -event.deltaX * delta, -event.deltaY * delta, panSpeed));
      } else {
        const rect = element.getBoundingClientRect();
        instance.setViewport(
          zoomAt(
            view,
            { x: event.clientX - rect.left, y: event.clientY - rect.top },
            event.deltaY * delta,
            zoomSpeed,
          ),
        );
      }
    };
    // A non-passive capture listener can prevent the browser and React Flow from also scrolling.
    element.addEventListener('wheel', wheel, { passive: false, capture: true });
    return () => element.removeEventListener('wheel', wheel, true);
  }, [instance, zoomSpeed, panSpeed]);
  return {
    canvas,
    zoomSpeed,
    setZoomSpeed,
    panSpeed,
    setPanSpeed,
    pointerHandlers: {
      onPointerDownCapture: (event) => {
        if (
          !instance ||
          event.pointerType === 'touch' ||
          ![0, 1].includes(event.button) ||
          !event.target.classList.contains('react-flow__pane')
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        drag.current = { x: event.clientX, y: event.clientY, view: instance.getViewport() };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMoveCapture: (event) => {
        if (!drag.current) return;
        instance.setViewport(
          panBy(
            drag.current.view,
            event.clientX - drag.current.x,
            event.clientY - drag.current.y,
            panSpeed,
          ),
        );
      },
      onPointerUpCapture: (event) => {
        if (!drag.current) return;
        drag.current = undefined;
        event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onPointerCancel: () => {
        drag.current = undefined;
      },
    },
  };
}
