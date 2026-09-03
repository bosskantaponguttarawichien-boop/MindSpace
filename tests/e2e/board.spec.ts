import { expect, test } from "@playwright/test";

test("loads the Phase 1 board shell and switches language", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Backend Learning" })).toBeVisible();
  await expect(page.getByTestId("board-canvas")).toBeVisible();
  await expect(page.getByTestId("board-canvas").getByRole("button", { name: "Select", exact: true })).toBeEnabled();
  await expect(page.getByText("Local prototype")).toBeVisible();

  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitem", { name: "ไทย" }).click();

  await expect(page.getByTestId("board-canvas").getByRole("button", { name: "เลือก", exact: true })).toBeVisible();
  await expect(page.getByText("ต้นแบบในเครื่อง")).toBeVisible();
});

test("ships an installable PWA manifest and app icons", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "MindSpace",
    display: "standalone",
    icons: [
      { src: "/icons/mindspace-192.png", sizes: "192x192" },
      { src: "/icons/mindspace-512.png", sizes: "512x512" },
    ],
  });

  const iconResponse = await page.request.get("/icons/mindspace-192.png");
  expect(iconResponse.ok()).toBe(true);
});

test("exposes the core board tools", async ({ page }) => {
  await page.goto("/");
  for (const tool of ["Text", "Sticky note", "Rectangle", "Circle", "Connector", "Draw"]) {
    await expect(page.getByRole("button", { name: tool })).toBeVisible();
  }
});

test("keeps the shape tool active for repeated placement and can undo", async ({ page }) => {
  await page.goto("/");
  const board = page.getByTestId("konva-board");
  await expect(board).toHaveAttribute("data-element-count", "5");

  await page.getByRole("button", { name: "Rectangle" }).click();
  await board.locator("canvas").first().click({ position: { x: 520, y: 270 } });
  await expect(board).toHaveAttribute("data-element-count", "6");
  await expect(page.getByRole("button", { name: "Rectangle" })).toHaveAttribute("aria-pressed", "true");

  await board.locator("canvas").first().click({ position: { x: 700, y: 320 } });
  await expect(board).toHaveAttribute("data-element-count", "7");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(board).toHaveAttribute("data-element-count", "6");
});

test("uses keyboard tool shortcuts and temporarily pans while Space is held", async ({ page }) => {
  await page.goto("/");
  const board = page.getByTestId("konva-board");

  await page.keyboard.press("d");
  await expect(page.getByRole("button", { name: "Draw and erase" })).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.down("Space");
  await expect(board).toHaveAttribute("data-space-panning", "true");
  await expect(board).toHaveClass("cursor-grab");

  await page.mouse.move(500, 430);
  await page.mouse.down();
  await page.mouse.move(620, 430);
  await page.mouse.up();
  await page.keyboard.up("Space");

  await expect(board).not.toHaveAttribute("data-space-panning");
  await expect(page.getByRole("button", { name: "Draw and erase" })).toHaveAttribute("aria-pressed", "true");
});

test("creates, formats, and edits a styled text element", async ({ page }) => {
  await page.goto("/");
  const board = page.getByTestId("konva-board");
  const canvas = board.locator("canvas").first();

  await page.getByRole("button", { name: "Text" }).click();
  await page.getByRole("button", { name: "Bold" }).click();
  await page.getByRole("button", { name: "24 px" }).click();
  await canvas.click({ position: { x: 520, y: 420 } });
  await expect(board).toHaveAttribute("data-element-count", "6");

  await page.getByRole("button", { name: "Text" }).click();
  await page.getByRole("button", { name: "Bold" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await canvas.dblclick({ position: { x: 520, y: 420 } });

  const editor = page.getByRole("textbox", { name: "Edit board item" });
  await expect(editor).toHaveCSS("font-size", "24px");
  await expect(editor).toHaveCSS("font-weight", "700");

  await page.keyboard.down("Space");
  await expect(board).not.toHaveAttribute("data-space-panning");
  await page.keyboard.up("Space");
});

test("selects a text element from its rendered area", async ({ page }) => {
  await page.goto("/");
  const board = page.getByTestId("konva-board");
  const canvas = board.locator("canvas").first();

  await page.getByRole("button", { name: "Text" }).click();
  await canvas.click({ position: { x: 520, y: 420 } });
  await expect(board).toHaveAttribute("data-element-count", "6");

  await page.getByRole("button", { name: "Select" }).click();
  await canvas.click({ position: { x: 520, y: 420 } });
  await page.keyboard.press("Delete");

  await expect(board).toHaveAttribute("data-element-count", "5");
});
