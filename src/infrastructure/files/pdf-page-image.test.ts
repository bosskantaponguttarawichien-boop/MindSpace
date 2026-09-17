import { describe, expect, it } from "vitest";
import { pdfPageImageName, pdfRenderScale } from "@/infrastructure/files/pdf-page-image";

describe("pdfRenderScale", () => {
  it("renders a small page large enough to stay sharp on the board", () => {
    expect(pdfRenderScale(595, 842)).toBeCloseTo(1920 / 842, 5);
  });

  it("never renders below the page's own size and never above the render cap", () => {
    expect(pdfRenderScale(2400, 3000)).toBe(1);
    expect(pdfRenderScale(10, 10)).toBe(4);
    expect(pdfRenderScale(0, 0)).toBe(1);
  });
});

describe("pdfPageImageName", () => {
  it("keeps the source name and marks the page as an image", () => {
    expect(pdfPageImageName("Reading list.PDF")).toBe("Reading list.png");
    expect(pdfPageImageName(".pdf")).toBe("pdf.png");
  });
});
