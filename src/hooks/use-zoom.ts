import { useState, useEffect } from 'react';

// Determine current browser zoom level.  We fall back to devicePixelRatio if
// visualViewport isn't available.  The value returned is >1 when the user has
// zoomed in, <1 when zoomed out, and exactly 1 at normal scale.
export function useZoom() {
  const [zoom, setZoom] = useState(() => {
    if (typeof window === 'undefined') return 1;
    if (window.visualViewport) return window.visualViewport.scale || 1;
    // outerWidth/innerWidth is a somewhat-robust heuristic used by many libs.
    return window.outerWidth / window.innerWidth || window.devicePixelRatio || 1;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      let z = 1;
      if (window.visualViewport) {
        z = window.visualViewport.scale || 1;
      } else {
        z = window.outerWidth / window.innerWidth || window.devicePixelRatio || 1;
      }
      setZoom(z);
    };

    window.addEventListener('resize', update);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', update);
      }
    };
  }, []);

  return zoom;
}
