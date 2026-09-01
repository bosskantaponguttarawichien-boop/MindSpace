import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which Radix scroll areas observe on mount.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
