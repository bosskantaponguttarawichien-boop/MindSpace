import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppHeight } from "@/shared/hooks/use-app-height";
import { installDeviceViewport, resetDeviceViewport, setStandalone } from "@/test/device-viewport";

function appHeight() {
  return document.documentElement.style.getPropertyValue("--app-height");
}

describe("useAppHeight", () => {
  afterEach(() => {
    resetDeviceViewport();
    document.documentElement.style.removeProperty("--app-height");
  });

  it("publishes the whole screen when installed, where the viewport falls short of it", () => {
    // iPhone in standalone: the screen is 844pt even though the viewport
    // resolves to 797pt, the 47pt top safe-area inset short.
    installDeviceViewport({ viewportHeight: 797, screenHeight: 844, topInset: 47, standalone: true });

    renderHook(() => useAppHeight());

    expect(appHeight()).toBe("844px");
  });

  it("keeps the 100dvh default in a browser tab, where collapsing toolbars move the viewport", () => {
    installDeviceViewport({ viewportHeight: 797, screenHeight: 844, topInset: 47, standalone: false });

    renderHook(() => useAppHeight());

    expect(appHeight()).toBe("");
  });

  it("remeasures after a rotation", () => {
    installDeviceViewport({ viewportHeight: 797, screenHeight: 844, topInset: 47, standalone: true });

    renderHook(() => useAppHeight());
    expect(appHeight()).toBe("844px");

    installDeviceViewport({
      viewportHeight: 343,
      screenHeight: 844,
      screenWidth: 390,
      topInset: 47,
      standalone: true,
      portrait: false,
    });
    act(() => window.dispatchEvent(new Event("resize")));

    expect(appHeight()).toBe("390px");
  });

  it("drops the measured height when the app stops running standalone", () => {
    installDeviceViewport({ viewportHeight: 797, screenHeight: 844, topInset: 47, standalone: true });

    renderHook(() => useAppHeight());
    expect(appHeight()).toBe("844px");

    act(() => setStandalone(false));

    expect(appHeight()).toBe("");
  });
});
