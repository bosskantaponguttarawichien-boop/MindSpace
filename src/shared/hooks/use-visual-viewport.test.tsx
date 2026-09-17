import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisualViewport } from "@/shared/hooks/use-visual-viewport";

type VisualViewportListener = () => void;

function installLayoutHeight(height: number) {
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: height });
}

function installVisualViewport(height: number, offsetTop = 0) {
  const listeners = new Map<string, VisualViewportListener>();
  const visualViewport = {
    height,
    offsetTop,
    addEventListener: vi.fn((event: string, listener: VisualViewportListener) => listeners.set(event, listener)),
    removeEventListener: vi.fn((event: string) => listeners.delete(event)),
  };

  Object.defineProperty(window, "visualViewport", { configurable: true, value: visualViewport });
  return { visualViewport, listeners };
}

describe("useVisualViewport", () => {
  afterEach(() => {
    Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
    Reflect.deleteProperty(document.documentElement, "clientHeight");
  });

  it("uses the visual viewport size after the mobile keyboard resizes it", () => {
    installLayoutHeight(760);
    const { visualViewport, listeners } = installVisualViewport(760);
    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ height: 760, offsetTop: 0 });

    visualViewport.height = 360;
    visualViewport.offsetTop = 12;
    act(() => listeners.get("resize")?.());

    expect(result.current).toEqual({ height: 360, offsetTop: 12 });
  });

  it("covers the layout viewport when iOS reports a visual viewport short by the top safe-area inset", () => {
    installLayoutHeight(844);
    const { visualViewport, listeners } = installVisualViewport(797);
    const { result } = renderHook(() => useVisualViewport());

    // The 47px the status bar sits over is not keyboard, so the overlay keeps it.
    expect(result.current).toEqual({ height: 844, offsetTop: 0 });

    // A keyboard on the same device shrinks the box by the keyboard only.
    visualViewport.height = 400;
    act(() => listeners.get("resize")?.());

    expect(result.current).toEqual({ height: 447, offsetTop: 0 });

    visualViewport.height = 797;
    act(() => listeners.get("resize")?.());

    expect(result.current).toEqual({ height: 844, offsetTop: 0 });
  });

  it("recalibrates the resting gap when the layout viewport changes size", () => {
    installLayoutHeight(844);
    const { visualViewport, listeners } = installVisualViewport(797);
    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ height: 844, offsetTop: 0 });

    installLayoutHeight(390);
    visualViewport.height = 390;
    act(() => listeners.get("resize")?.());

    expect(result.current).toEqual({ height: 390, offsetTop: 0 });
  });
});
