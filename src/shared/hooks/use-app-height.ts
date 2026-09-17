"use client";

import { useEffect } from "react";

type LegacyStandaloneNavigator = Navigator & { standalone?: boolean };

function isStandalone(standaloneQuery: MediaQueryList): boolean {
  return standaloneQuery.matches || (navigator as LegacyStandaloneNavigator).standalone === true;
}

/**
 * Keeps `--app-height` equal to the screen the app actually owns.
 *
 * In an installed iOS PWA painting under a translucent status bar, `100dvh`
 * resolves short by the top safe-area inset, so a shell sized with it leaves a
 * blank strip along the bottom edge. The layout viewport is the full screen
 * there, and an installed app has no collapsing browser toolbars that would
 * make the layout viewport too tall, so the measured height replaces the
 * `100dvh` default only while the app runs standalone.
 */
export function useAppHeight(): void {
  useEffect(() => {
    const root = document.documentElement;
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    const updateAppHeight = () => {
      if (!isStandalone(standaloneQuery)) {
        root.style.removeProperty("--app-height");
        return;
      }

      const layoutHeight = root.clientHeight || window.innerHeight;
      if (layoutHeight > 0) root.style.setProperty("--app-height", `${layoutHeight}px`);
    };

    updateAppHeight();
    window.addEventListener("resize", updateAppHeight);
    window.addEventListener("orientationchange", updateAppHeight);
    standaloneQuery.addEventListener("change", updateAppHeight);

    return () => {
      window.removeEventListener("resize", updateAppHeight);
      window.removeEventListener("orientationchange", updateAppHeight);
      standaloneQuery.removeEventListener("change", updateAppHeight);
      root.style.removeProperty("--app-height");
    };
  }, []);
}
