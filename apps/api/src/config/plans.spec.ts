import { Plan } from "@prisma/client";
import {
  PLAN_CATALOG,
  PLAN_ORDER,
  currentMonth,
  effectiveRetentionDays,
  effectiveUploadLimit,
  getPlan,
  planAllows,
} from "./plans";

const MB = 1024 * 1024;

describe("plan catalog", () => {
  it("defines the three plans in ascending order", () => {
    expect(PLAN_ORDER).toEqual([Plan.FREE, Plan.PRO, Plan.ENTERPRISE]);
    expect(PLAN_CATALOG.FREE.monthlyAnalyses).toBe(3);
    expect(PLAN_CATALOG.FREE.maxApiKeys).toBe(1);
    expect(PLAN_CATALOG.PRO.monthlyAnalyses).toBe(100);
    expect(PLAN_CATALOG.PRO.maxApiKeys).toBe(10);
    expect(PLAN_CATALOG.ENTERPRISE.maxApiKeys).toBe(50);
  });

  it("falls back to the free plan for unknown enum values", () => {
    expect(getPlan("NOT_A_PLAN" as Plan)).toBe(PLAN_CATALOG.FREE);
  });

  it("applies the smaller of the plan and operator upload limits", () => {
    expect(effectiveUploadLimit(Plan.FREE, 2 * 1024 * MB)).toBe(100 * MB);
    expect(effectiveUploadLimit(Plan.PRO, 2 * 1024 * MB)).toBe(500 * MB);
    expect(effectiveUploadLimit(Plan.ENTERPRISE, 2 * 1024 * MB)).toBe(2 * 1024 * MB);
    expect(effectiveUploadLimit(Plan.ENTERPRISE, 250 * MB)).toBe(250 * MB);
  });

  it("honours a global retention ceiling", () => {
    expect(effectiveRetentionDays(Plan.FREE, 30)).toBe(7);
    expect(effectiveRetentionDays(Plan.PRO, 30)).toBe(30);
    expect(effectiveRetentionDays(Plan.ENTERPRISE, 30)).toBe(30);
    expect(effectiveRetentionDays(Plan.ENTERPRISE, 0)).toBe(90);
  });

  it("gates API and priority features to paid plans", () => {
    expect(planAllows(Plan.FREE, "api")).toBe(false);
    expect(planAllows(Plan.PRO, "api")).toBe(true);
    expect(planAllows(Plan.ENTERPRISE, "priority")).toBe(true);
    expect(planAllows(Plan.FREE, "priority")).toBe(false);
  });

  it("formats usage months in UTC", () => {
    expect(currentMonth(new Date("2026-01-05T23:59:59.000Z"))).toBe("2026-01");
    expect(currentMonth(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12");
  });
});
