import { vi } from "vitest";

export type DeviceViewport = {
  /** Height the layout viewport reports, which iOS understates when installed. */
  viewportHeight: number;
  /** Height of the display, as `window.screen` reports it. */
  screenHeight: number;
  screenWidth?: number;
  topInset?: number;
  standalone?: boolean;
  portrait?: boolean;
};

type MediaListener = () => void;

const media = new Map<string, { matches: boolean; listeners: Set<MediaListener> }>();
let restoreRect: (() => void) | null = null;
let currentTopInset = 0;

function queryFor(query: string) {
  const entry = media.get(query) ?? { matches: false, listeners: new Set<MediaListener>() };
  media.set(query, entry);
  return {
    get matches() {
      return entry.matches;
    },
    addEventListener: (_: string, listener: MediaListener) => entry.listeners.add(listener),
    removeEventListener: (_: string, listener: MediaListener) => entry.listeners.delete(listener),
  };
}

/**
 * Stands the test in front of a device: how tall the viewport claims to be, how
 * tall the screen really is, and what the top safe-area inset measures.
 */
export function installDeviceViewport({
  viewportHeight,
  screenHeight,
  screenWidth = 390,
  topInset = 0,
  standalone = false,
  portrait = true,
}: DeviceViewport) {
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: viewportHeight });
  Object.defineProperty(window, "screen", {
    configurable: true,
    value: { width: screenWidth, height: screenHeight },
  });

  for (const entry of media.values()) entry.matches = false;
  queryFor("(display-mode: standalone)");
  queryFor("(display-mode: fullscreen)");
  queryFor("(orientation: portrait)");
  media.get("(display-mode: standalone)")!.matches = standalone;
  media.get("(orientation: portrait)")!.matches = portrait;

  Object.defineProperty(window, "matchMedia", { configurable: true, value: queryFor });

  if (!restoreRect) {
    const original = Element.prototype.getBoundingClientRect;
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return this instanceof HTMLElement && this.dataset.safeAreaProbe === "top"
        ? ({ height: currentTopInset } as DOMRect)
        : original.call(this);
    });
    restoreRect = () => spy.mockRestore();
  }
  currentTopInset = topInset;
}

/** Flips the installed-app state and notifies the `display-mode` listeners. */
export function setStandalone(standalone: boolean) {
  const entry = media.get("(display-mode: standalone)");
  if (!entry) return;
  entry.matches = standalone;
  entry.listeners.forEach((listener) => listener());
}

export function resetDeviceViewport() {
  Reflect.deleteProperty(document.documentElement, "clientHeight");
  Reflect.deleteProperty(window, "screen");
  Reflect.deleteProperty(window, "matchMedia");
  document.querySelectorAll("[data-safe-area-probe]").forEach((probe) => probe.remove());
  media.clear();
  currentTopInset = 0;
  restoreRect?.();
  restoreRect = null;
}
