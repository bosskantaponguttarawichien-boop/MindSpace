"use client";

import { useEffect, useRef, useState } from "react";

export type VisualViewportSize = {
  height: number;
  offsetTop: number;
};

/**
 * Tracks the box a full-screen overlay should cover. It follows the visual
 * viewport so the overlay shrinks when the on-screen keyboard opens, unlike the
 * layout viewport.
 *
 * iOS needs one correction: in an installed PWA painting under a translucent
 * status bar, `visualViewport.height` is already short by the top safe-area
 * inset while no keyboard is open, which would leave a strip of the screen
 * uncovered. That resting gap is measured per layout size and added back, so
 * only a real keyboard shrinks the box.
 */
export function useVisualViewport(): VisualViewportSize | null {
  const [viewport, setViewport] = useState<VisualViewportSize | null>(null);
  const restingGapRef = useRef<{ layoutHeight: number; gap: number } | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
      const visibleHeight = visualViewport?.height ?? window.innerHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;
      const gap = Math.max(0, layoutHeight - visibleHeight - offsetTop);
      const restingGap = restingGapRef.current;

      // A keyboard only ever grows the gap, so the smallest gap seen at this
      // layout size is the resting one. A new layout size — rotation, browser
      // chrome appearing — recalibrates it.
      if (!restingGap || restingGap.layoutHeight !== layoutHeight || gap < restingGap.gap) {
        restingGapRef.current = { layoutHeight, gap };
      }

      const nextViewport = {
        height: visibleHeight + (restingGapRef.current?.gap ?? 0),
        offsetTop,
      };

      setViewport((currentViewport) =>
        currentViewport?.height === nextViewport.height && currentViewport.offsetTop === nextViewport.offsetTop
          ? currentViewport
          : nextViewport,
      );
    };

    updateViewport();
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return viewport;
}
