import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import type { BoardDocument } from "@/domain/board/board-document";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";
import { PdfImportError, renderPdfFirstPage } from "@/infrastructure/files/pdf-page-image";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

const addImage = vi.fn();

vi.mock("@/infrastructure/board-engine/konva-board", () => ({
  KonvaBoard: ({ onReady }: { onReady: (engine: BoardEngine) => void }) => {
    useEffect(() => onReady({ addImage } as unknown as BoardEngine), [onReady]);
    return <div data-testid="konva-board" />;
  },
}));

vi.mock("@/infrastructure/files/pdf-page-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/infrastructure/files/pdf-page-image")>()),
  renderPdfFirstPage: vi.fn(),
}));

const document: BoardDocument = { version: 1, id: "board:test", name: "Reading", elements: [], connections: [] };
const pdfFile = new File(["%PDF-1.4"], "reading.pdf", { type: "application/pdf" });
const pageImage = new File(["page"], "reading.png", { type: "image/png" });

function renderCanvas(onUploadImage = vi.fn().mockResolvedValue({ url: "https://example.test/reading.png", width: 1240, height: 1754 })) {
  render(
    <LocaleProvider><TooltipProvider>
      <BoardCanvas
        onEngineReady={vi.fn()}
        document={document}
        onDocumentChange={vi.fn()}
        onUploadImage={onUploadImage}
        onDeleteImages={vi.fn().mockResolvedValue(undefined)}
      />
    </TooltipProvider></LocaleProvider>,
  );
  return { onUploadImage, input: window.document.querySelector<HTMLInputElement>('input[accept="application/pdf"]')! };
}

describe("BoardCanvas PDF import", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds the rendered first page to the board through the image upload path", async () => {
    vi.mocked(renderPdfFirstPage).mockResolvedValue({ file: pageImage, pageCount: 1 });
    const { onUploadImage, input } = renderCanvas();

    await userEvent.upload(input, pdfFile);

    await waitFor(() => expect(addImage).toHaveBeenCalledWith({ url: "https://example.test/reading.png", width: 1240, height: 1754 }));
    expect(onUploadImage).toHaveBeenCalledWith(pageImage);
    expect(screen.queryByText("Only the first page was added to the board.")).not.toBeInTheDocument();
  });

  it("says that a longer PDF contributed only its first page", async () => {
    vi.mocked(renderPdfFirstPage).mockResolvedValue({ file: pageImage, pageCount: 12 });
    const { input } = renderCanvas();

    await userEvent.upload(input, pdfFile);

    expect(await screen.findByText("Only the first page was added to the board.")).toBeVisible();
  });

  it("reports a PDF that cannot be rendered in the reader's language and adds nothing", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(renderPdfFirstPage).mockRejectedValue(new PdfImportError("encrypted"));
    const { onUploadImage, input } = renderCanvas();

    await userEvent.upload(input, pdfFile);

    await waitFor(() => expect(alert).toHaveBeenCalledWith("This PDF is password protected, so its page could not be added."));
    expect(onUploadImage).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("rejects a file that is not a usable PDF before any rendering starts", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const { input } = renderCanvas();

    // applyAccept is off so the guard itself is exercised, not the browser's accept filter.
    await userEvent.upload(input, new File(["x"], "reading.png", { type: "image/png" }), { applyAccept: false });

    expect(alert).toHaveBeenCalledWith("Choose a PDF file of 25 MB or smaller.");
    expect(renderPdfFirstPage).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
