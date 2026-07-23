import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("주유소알리미 - 내 주변 저가 주유소");
});
