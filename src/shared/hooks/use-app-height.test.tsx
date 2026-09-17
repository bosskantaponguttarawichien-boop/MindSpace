import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppHeight } from "@/shared/hooks/use-app-height";

type MediaListener = () => void;

function installLayoutHeight(height: number) {
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: height });
}

function installDisplayMode(standalone: boolean) {
  const listeners = new Set<MediaListener>();
  const query = {
    matches: standalone,
    addEventListener: vi.fn((_: string, listener: MediaListener) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: MediaListener) => listeners.delete(listener)),
  };

  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => query });
  return { query, listeners };
}

function appHeight() {
  return document.documentElement.style.getPropertyValue("--app-height");
}

describe("useAppHeight", () => {
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, "clientHeight");
    Reflect.deleteProperty(window, "matchMedia");
    document.documentElement.style.removeProperty("--app-height");
  });

  it("publishes the layout viewport height when installed, where 100dvh falls short of the screen", () => {
    // iPhone in standalone: the screen is 844pt even though `100dvh` resolves
    // to 797pt, the 47pt top safe-area inset short.
    installLayoutHeight(844);
    installDisplayMode(true);

    renderHook(() => useAppHeight());

    expect(appHeight()).toBe("844px");
  });

  it("keeps the 100dvh default in a browser tab, where collapsing toolbars move the viewport", () => {
    installLayoutHeight(844);
    installDisplayMode(false);

    renderHook(() => useAppHeight());

    expect(appHeight()).toBe("");
  });

  it("remeasures after a rotation", () => {
    installLayoutHeight(844);
    installDisplayMode(true);

    renderHook(() => useAppHeight());
    expect(appHeight()).toBe("844px");

    installLayoutHeight(390);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(appHeight()).toBe("390px");
  });

  it("drops the measured height when the app stops running standalone", () => {
    installLayoutHeight(844);
    const { query, listeners } = installDisplayMode(true);

    renderHook(() => useAppHeight());
    expect(appHeight()).toBe("844px");

    query.matches = false;
    act(() => listeners.forEach((listener) => listener()));

    expect(appHeight()).toBe("");
  });
});
