import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisualViewport } from "@/shared/hooks/use-visual-viewport";

type VisualViewportListener = () => void;

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
  });

  it("uses the visual viewport size after the mobile keyboard resizes it", () => {
    const { visualViewport, listeners } = installVisualViewport(760);
    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ height: 760, offsetTop: 0 });

    visualViewport.height = 360;
    visualViewport.offsetTop = 12;
    act(() => listeners.get("resize")?.());

    expect(result.current).toEqual({ height: 360, offsetTop: 12 });
  });
});
