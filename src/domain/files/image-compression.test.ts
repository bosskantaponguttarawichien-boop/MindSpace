import { describe, expect, it } from "vitest";
import { compressedDimensions, isSupportedImageType } from "@/domain/files/image-compression";

describe("image compression policy", () => {
  it("limits the longest side to 1920 while retaining the aspect ratio", () => {
    expect(compressedDimensions(4000, 2000)).toEqual({ width: 1920, height: 960 });
    expect(compressedDimensions(1000, 800)).toEqual({ width: 1000, height: 800 });
  });

  it("allows only supported raster image types", () => {
    expect(isSupportedImageType("image/jpeg")).toBe(true);
    expect(isSupportedImageType("image/gif")).toBe(true);
    expect(isSupportedImageType("image/svg+xml")).toBe(false);
  });
});
