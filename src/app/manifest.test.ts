import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("declares a fullscreen MindSpace app with install icons", () => {
    expect(manifest()).toMatchObject({
      name: "MindSpace",
      short_name: "MindSpace",
      display: "fullscreen",
      start_url: "/",
      background_color: "#4939ed",
      theme_color: "#ffffff",
      icons: [
        { src: "/icons/mindspace-192.png", sizes: "192x192" },
        { src: "/icons/mindspace-512.png", sizes: "512x512" },
      ],
    });
  });
});
