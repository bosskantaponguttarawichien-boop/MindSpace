type LegacyStandaloneNavigator = Navigator & { standalone?: boolean };

/** True while the app runs as an installed PWA rather than in a browser tab. */
export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as LegacyStandaloneNavigator).standalone === true
  );
}

let insetProbe: HTMLElement | null = null;

/**
 * The top safe-area inset in CSS pixels, measured through a hidden element so
 * the value comes from the engine's own `env()` resolution rather than from
 * parsing a custom property, which Safari does not always report resolved.
 */
export function measureTopInset(): number {
  if (!document.body) return 0;

  if (!insetProbe?.isConnected) {
    insetProbe = document.createElement("div");
    insetProbe.setAttribute("aria-hidden", "true");
    insetProbe.dataset.safeAreaProbe = "top";
    insetProbe.style.cssText =
      "position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)";
    document.body.appendChild(insetProbe);
  }

  return insetProbe.getBoundingClientRect().height;
}

/** The height of the display the installed app fills, or 0 when unknown. */
function measureScreenHeight(): number {
  const width = window.screen?.width ?? 0;
  const height = window.screen?.height ?? 0;
  if (width <= 0 || height <= 0) return 0;

  // iOS has reported `screen` in a fixed orientation across several releases,
  // so pick the dimension that matches how the device is held instead of
  // trusting `screen.height` to follow a rotation.
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  return portrait ? Math.max(width, height) : Math.min(width, height);
}

/**
 * How far the reported viewport falls short of the screen the app owns.
 *
 * An installed iOS app painting under a translucent status bar covers the whole
 * screen, but every viewport measurement it offers — `100dvh`, `innerHeight`,
 * `documentElement.clientHeight`, `visualViewport.height` — comes back short by
 * exactly the top safe-area inset, so anything sized from them leaves a strip
 * of bare page along the bottom edge.
 *
 * The correction is capped at that inset: it is the exact size of the defect,
 * and the cap keeps a platform that simply reports a larger screen than the
 * window it grants us (system bars outside the web view) from stretching the
 * shell past the window. A zero inset means no correction at all.
 */
export function measureViewportShortfall(viewportHeight: number): number {
  if (viewportHeight <= 0 || !isStandaloneDisplay()) return 0;

  const screenHeight = measureScreenHeight();
  if (screenHeight <= viewportHeight) return 0;

  return Math.min(screenHeight - viewportHeight, measureTopInset());
}

/** The height the app shell and its full-screen overlays should fill. */
export function measureAppHeight(): number {
  const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
  return viewportHeight + measureViewportShortfall(viewportHeight);
}
