import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("home page presents the self-hosted product and responsible-use copy", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/VeriFrame/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Know what the video is really made of.",
    );
    await expect(page.getByText(/self-hosted media forensics/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /analyze a video/i }).first()).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText(/VeriFrame/i);
  });

  test("pricing explains operator-managed plans without card collection", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pricing that scales");
    await expect(page.getByText(/no card collected/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  });

  test("developer documentation describes the public API", async ({ page }) => {
    await page.goto("/docs");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Developer documentation");
    await expect(page.getByRole("heading", { name: "Quickstart" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Authentication" })).toBeVisible();
    await expect(page.getByText("x-api-key").first()).toBeVisible();
  });

  test("legal pages are published as templates", async ({ page }) => {
    for (const path of [
      "/legal/privacy",
      "/legal/terms",
      "/legal/cookies",
      "/legal/acceptable-use",
    ]) {
      const response = await page.goto(path);
      expect(response?.ok(), `${path} should render`).toBeTruthy();
      await expect(page.getByText(/template/i).first()).toBeVisible();
    }
  });

  test("unknown routes render the branded not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page does not exist" })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible();
  });
});
