import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which Radix scroll areas observe on mount.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Node can expose an incomplete built-in localStorage before JSDOM installs its
// implementation. Locale tests exercise storage during render, so provide the
// complete browser contract when that happens.
if (typeof window.localStorage?.getItem !== "function") {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
}
