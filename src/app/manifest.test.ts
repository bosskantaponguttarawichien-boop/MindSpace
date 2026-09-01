import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("declares a standalone MindSpace app with install icons", () => {
    expect(manifest()).toMatchObject({
      name: "MindSpace",
      short_name: "MindSpace",
      display: "standalone",
      start_url: "/",
      icons: [
        { src: "/icons/mindspace-192.png", sizes: "192x192" },
        { src: "/icons/mindspace-512.png", sizes: "512x512" },
      ],
    });
  });
});
