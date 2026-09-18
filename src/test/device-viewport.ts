export type DeviceViewport = {
  /** Height the layout viewport reports — the box the page is laid out in. */
  viewportHeight: number;
};

/** Stands the test in front of a device of a given viewport height. */
export function installDeviceViewport({ viewportHeight }: DeviceViewport) {
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: viewportHeight });
}

export function resetDeviceViewport() {
  Reflect.deleteProperty(document.documentElement, "clientHeight");
}
