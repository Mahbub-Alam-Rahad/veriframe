import { expect, test } from "@playwright/test";

test.describe("authentication", () => {
  test("protected dashboard routes redirect to sign in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("admin routes preserve the requested destination", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers$/);
  });

  test("sign in validates empty credentials before calling the API", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    await expect(page.getByText(/password/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("registration page exposes the account form and plan limits", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/create|account/i);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
  });

  test("password reset flow pages are reachable", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();

    await page.goto("/reset-password?token=invalid-token");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
