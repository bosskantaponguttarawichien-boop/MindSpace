import { afterEach, describe, expect, it } from "vitest";
import { measureViewportHeight } from "@/shared/lib/app-viewport";
import { installDeviceViewport, resetDeviceViewport } from "@/test/device-viewport";

describe("app viewport", () => {
  afterEach(resetDeviceViewport);

  it("reads the height of the viewport the page is laid out in", () => {
    // An installed iPhone 13-class app: the screen is 844pt, of which iOS keeps
    // the 47pt status bar and hands the page the remaining 797.
    installDeviceViewport({ viewportHeight: 797 });

    expect(measureViewportHeight()).toBe(797);
  });

  it("falls back to the window when the document reports no height yet", () => {
    installDeviceViewport({ viewportHeight: 0 });

    expect(measureViewportHeight()).toBe(window.innerHeight);
  });
});
