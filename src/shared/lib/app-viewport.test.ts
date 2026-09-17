import { afterEach, describe, expect, it } from "vitest";
import { measureAppHeight, measureTopInset, measureViewportShortfall } from "@/shared/lib/app-viewport";
import { installDeviceViewport, resetDeviceViewport } from "@/test/device-viewport";

// An iPhone 13-class screen: 844pt tall with a 47pt top safe-area inset. When
// the app is installed and painting under the translucent status bar, iOS
// reports the viewport as 797pt — the screen less that inset — while the web
// view still covers all 844.
const installedIphone = { viewportHeight: 797, screenHeight: 844, topInset: 47, standalone: true };

describe("app viewport", () => {
  afterEach(resetDeviceViewport);

  it("measures the top inset through a probe the engine resolves `env()` against", () => {
    installDeviceViewport(installedIphone);

    expect(measureTopInset()).toBe(47);
  });

  it("adds back the screen an installed iOS app owns but leaves out of its viewport", () => {
    installDeviceViewport(installedIphone);

    expect(measureAppHeight()).toBe(844);
  });

  it("leaves a browser tab on its own viewport, where toolbars legitimately shorten it", () => {
    installDeviceViewport({ ...installedIphone, standalone: false });

    expect(measureAppHeight()).toBe(797);
  });

  it("never stretches past the top inset when the screen is larger than the window granted", () => {
    // Android hands an installed app a window inside the system bars: the
    // screen is taller, but every pixel of that difference belongs to the
    // system, and the inset is 0 because nothing overlaps the page.
    installDeviceViewport({ viewportHeight: 700, screenHeight: 844, topInset: 0, standalone: true });

    expect(measureAppHeight()).toBe(700);
  });

  it("caps the correction at the inset when the screen runs further ahead of the viewport", () => {
    installDeviceViewport({ viewportHeight: 700, screenHeight: 844, topInset: 47, standalone: true });

    expect(measureViewportShortfall(700)).toBe(47);
  });

  it("reads the screen's short side as the height once the device is turned", () => {
    installDeviceViewport({
      viewportHeight: 343,
      screenHeight: 844,
      screenWidth: 390,
      topInset: 47,
      standalone: true,
      portrait: false,
    });

    expect(measureAppHeight()).toBe(390);
  });

  it("stays on the reported viewport when the screen reads no taller", () => {
    installDeviceViewport({ viewportHeight: 844, screenHeight: 844, topInset: 47, standalone: true });

    expect(measureAppHeight()).toBe(844);
  });
});
