import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportPdfDialog } from "@/features/board/components/export-pdf-dialog";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

const preview = { dataUrl: "data:image/png;base64,iVBORw0KGgo=", width: 1123, height: 794 };

function renderDialog(onClose = vi.fn()) {
  render(<LocaleProvider><ExportPdfDialog preview={preview} onClose={onClose} /></LocaleProvider>);
  return onClose;
}

describe("ExportPdfDialog", () => {
  it("shows the rendered page before anything is printed", () => {
    renderDialog();
    expect(screen.getByAltText("Preview of the board page that will be exported")).toHaveAttribute("src", preview.dataUrl);
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
  });

  it("closes without printing when the export is cancelled", async () => {
    const user = userEvent.setup();
    const onClose = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
  });

  it("prints the page through an iframe when the export is confirmed", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window.HTMLIFrameElement.prototype, "contentWindow", "get");
    const frameWindow = { focus: vi.fn(), print: vi.fn(), addEventListener: vi.fn() };
    print.mockReturnValue(frameWindow as unknown as Window);
    const onClose = renderDialog();

    await user.click(screen.getByRole("button", { name: "Export PDF" }));

    const frame = document.querySelector("iframe");
    const printedImage = frame?.contentDocument?.images[0];
    expect(printedImage).toHaveAttribute("src", preview.dataUrl);

    printedImage?.dispatchEvent(new Event("load"));

    expect(frameWindow.print).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    print.mockRestore();
  });
});
