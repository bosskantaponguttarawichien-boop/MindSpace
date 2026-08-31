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

test("exposes the core board tools", async ({ page }) => {
  await page.goto("/");
  for (const tool of ["Text", "Sticky note", "Rectangle", "Circle", "Connector", "Draw"]) {
    await expect(page.getByRole("button", { name: tool })).toBeVisible();
  }
});

test("creates a Konva shape and can undo it", async ({ page }) => {
  await page.goto("/");
  const board = page.getByTestId("konva-board");
  await expect(board).toHaveAttribute("data-element-count", "5");

  await page.getByRole("button", { name: "Rectangle" }).click();
  await board.locator("canvas").first().click({ position: { x: 520, y: 270 } });
  await expect(board).toHaveAttribute("data-element-count", "6");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(board).toHaveAttribute("data-element-count", "5");
});
