"use client";

import { useEffect } from "react";
import { isStandaloneDisplay, measureAppHeight } from "@/shared/lib/app-viewport";

/**
 * Keeps `--app-height` equal to the screen the app actually owns.
 *
 * In an installed iOS app painting under a translucent status bar, `100dvh`
 * resolves short by the top safe-area inset, so a shell sized with it leaves a
 * blank strip along the bottom edge. `measureAppHeight` adds that shortfall
 * back. A browser tab keeps the `100dvh` default, where collapsing toolbars
 * move the viewport and the measurement would lag behind them.
 */
export function useAppHeight(): void {
  useEffect(() => {
    const root = document.documentElement;

    const updateAppHeight = () => {
      if (!isStandaloneDisplay()) {
        root.style.removeProperty("--app-height");
        return;
      }

      const appHeight = measureAppHeight();
      if (appHeight > 0) root.style.setProperty("--app-height", `${appHeight}px`);
    };

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

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
