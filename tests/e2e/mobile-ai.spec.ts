import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`mobile AI reveals from its button and closes (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    const sheet = page.locator(".mobile-ai-reveal");
    const button = page.getByRole("button", { name: "Board AI", exact: true });
    await expect(button).toBeVisible();
    await expect(sheet).toHaveAttribute("inert", "");
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    const closedClip = await sheet.evaluate((node) => getComputedStyle(node).clipPath);
    // The reveal starts at the real floating button, not an arbitrary corner.
    const topInset = Number(closedClip.match(/inset\(([\d.]+)px/)?.[1]);
    expect(topInset).toBeCloseTo(box!.y, 0);
    await button.click();
    await expect(sheet).toHaveAttribute("aria-hidden", "false");
    await expect(sheet).not.toHaveAttribute("inert");
    await expect(sheet).toHaveCSS("clip-path", "inset(0px round 0px)");
    const input = sheet.getByRole("textbox");
    await input.fill("Keep this draft");
    await sheet.getByRole("button", { name: "Collapse AI panel" }).click();
    await expect(sheet).toHaveAttribute("inert", "");
    await expect(sheet).toHaveCSS("clip-path", closedClip);
    await expect(sheet).toBeHidden();
    await button.click();
    await expect(input).toHaveValue("Keep this draft");
    if (reducedMotion === "reduce") {
      await expect(sheet).toHaveCSS("transition-duration", "0s");
    }
  });
}
