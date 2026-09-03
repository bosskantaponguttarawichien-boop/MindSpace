"use client";

import { useEffect, useState } from "react";

export type VisualViewportSize = {
  height: number;
  offsetTop: number;
};

/**
 * Tracks the part of the browser that is actually visible. On mobile Safari
 * this shrinks when the on-screen keyboard opens, unlike the layout viewport.
 */
export function useVisualViewport(): VisualViewportSize | null {
  const [viewport, setViewport] = useState<VisualViewportSize | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const nextViewport = {
        height: visualViewport?.height ?? window.innerHeight,
        offsetTop: visualViewport?.offsetTop ?? 0,
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
