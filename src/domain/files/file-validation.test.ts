import { describe, expect, it } from "vitest";
import { isSupportedPdf } from "@/domain/files/file-validation";

describe("isSupportedPdf", () => {
  it("accepts a PDF based on its extension when iOS omits its MIME type", () => {
    expect(isSupportedPdf({ name: "reading.pdf", type: "", size: 1024 })).toBe(true);
  });

  it("rejects a non-PDF or a file over 25 MB", () => {
    expect(isSupportedPdf({ name: "reading.png", type: "image/png", size: 1024 })).toBe(false);
    expect(isSupportedPdf({ name: "reading.pdf", type: "application/pdf", size: 26 * 1024 * 1024 })).toBe(false);
  });
});
