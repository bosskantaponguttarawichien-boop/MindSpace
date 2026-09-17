export type PdfPageImage = { file: File; pageCount: number };

export type PdfImportFailure = "unreadable" | "encrypted" | "renderFailed";

/** Carries a stable reason so the UI can render it in the reader's language. */
export class PdfImportError extends Error {
  readonly reason: PdfImportFailure;

  constructor(reason: PdfImportFailure, cause?: unknown) {
    super(reason, { cause });
    this.name = "PdfImportError";
    this.reason = reason;
  }
}

/** A page rendered under the upload pipeline's own 1920 px cap stays sharp without paying for pixels the upload would throw away. */
const PDFJS_ASSET_BASE = "/pdfjs/";
const TARGET_LONGEST_EDGE = 1920;
const MAX_RENDER_SCALE = 4;

export function pdfRenderScale(pageWidth: number, pageHeight: number) {
  const longestEdge = Math.max(pageWidth, pageHeight);
  if (longestEdge <= 0) return 1;
  return Math.min(MAX_RENDER_SCALE, Math.max(1, TARGET_LONGEST_EDGE / longestEdge));
}

export function pdfPageImageName(pdfName: string) {
  return `${pdfName.replace(/\.pdf$/i, "").trim() || "pdf"}.png`;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Rasterizes page 1 of a PDF in the browser so it can travel through the existing image
 * upload path; PDF bytes themselves are never stored, and no text is extracted.
 */
export async function renderPdfFirstPage(file: File): Promise<PdfPageImage> {
  // The legacy build is the transpiled one: pdf.js' default build needs JS engine features that
  // current Safari and every Chrome before 143 lack, which would fail the import on real phones.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  // Untrusted bytes are parsed in pdf.js' worker, and every runtime asset it may need is served
  // from this origin (see scripts/copy-pdfjs-assets.mjs) rather than fetched from a CDN.
  const task = pdfjs.getDocument({
    data,
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    cMapPacked: true,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
  });
  let pdf;
  try {
    pdf = await task.promise;
  } catch (error: unknown) {
    void task.destroy();
    throw new PdfImportError(error instanceof pdfjs.PasswordException ? "encrypted" : "unreadable", error);
  }

  try {
    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: pdfRenderScale(unscaled.width, unscaled.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    await page.render({ canvas, viewport, background: "rgb(255,255,255)" }).promise;
    const blob = await canvasBlob(canvas);
    if (!blob) throw new PdfImportError("renderFailed");
    return { file: new File([blob], pdfPageImageName(file.name), { type: "image/png", lastModified: file.lastModified }), pageCount: pdf.numPages };
  } catch (error: unknown) {
    throw error instanceof PdfImportError ? error : new PdfImportError("renderFailed", error);
  } finally {
    void task.destroy();
  }
}
