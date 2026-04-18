import { expect, test } from "@playwright/test";

test("loads game page and starts a round", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("猜 25-26 常规赛球员")).toBeVisible();
  await expect(page.getByText("Easy (MPG >= 25)")).toBeVisible();
  await expect(page.getByPlaceholder("输入球员英文名/中文名/别名...")).toBeVisible();
});

