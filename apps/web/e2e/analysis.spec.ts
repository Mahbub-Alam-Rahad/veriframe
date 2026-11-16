import path from "node:path";
import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const mockBackend = (process.env.E2E_EXPECT_MOCK ?? "false") === "true";
const fixture = path.join(__dirname, "fixtures", "sample.mp4");

/**
 * End-to-end analysis requires the complete stack (API, worker, ML service,
 * Postgres, Redis, MinIO). It is skipped unless credentials are provided:
 *
 *   E2E_EMAIL=admin@example.com E2E_PASSWORD=... E2E_EXPECT_MOCK=true \
 *     pnpm --filter @deepfake/web test:e2e
 *
 * The account must be verified and have remaining analyses.
 */
test.describe("video analysis", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run the full analysis flow.");

  test("signs in, uploads a clip and renders the result with a disclaimer", async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto("/login?next=/dashboard/analyze");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard/analyze", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Analyze a video" })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(fixture);
    await expect(page.getByText("sample.mp4")).toBeVisible();

    const start = page.getByRole("button", { name: /start analysis/i });
    await expect(start).toBeEnabled({ timeout: 15_000 });
    await start.click();

    // The workspace polls the job and redirects to the result page when done.
    await page.waitForURL(/\/dashboard\/videos\/[0-9a-zA-Z-]+$/, { timeout: 200_000 });
    await expect(page.getByRole("heading", { name: "What to do next" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/fake probability/i).first()).toBeVisible();
    await expect(page.getByText(/not proof|probabilistic|signal, not a conclusion/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /download pdf/i })).toBeVisible();

    if (mockBackend) {
      await expect(page.getByText(/mock model/i).first()).toBeVisible();
    }
  });
});
