import type { PlanDefinition, PlanId } from "./types";

const MB = 1024 * 1024;

/**
 * Marketing copy for the default plan limits. Runtime limits are returned by
 * the API and may be raised by the operator through environment variables.
 */
export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceMonthly: 0,
    monthlyAnalyses: 3,
    maxUploadBytes: 100 * MB,
    maxVideoSeconds: 60,
    maxApiKeys: 1,
    retentionDays: 7,
    features: [
      "3 video analyses per month",
      "Up to 60 seconds per video",
      "Frame-level score and timeline",
      "Downloadable PDF report",
      "7-day media retention",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 49,
    monthlyAnalyses: 100,
    maxUploadBytes: 500 * MB,
    maxVideoSeconds: 10 * 60,
    maxApiKeys: 10,
    retentionDays: 30,
    features: [
      "100 video analyses per month",
      "Up to 10 minutes per video",
      "Public API and API keys",
      "Priority analysis queue",
      "30-day media retention",
    ],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: 0,
    monthlyAnalyses: 2000,
    maxUploadBytes: 2 * 1024 * MB,
    maxVideoSeconds: 30 * 60,
    maxApiKeys: 50,
    retentionDays: 90,
    features: [
      "Volume analysis allowance",
      "Up to 30 minutes per video",
      "Model version selection",
      "Audit logs and team access",
      "Dedicated support and SLA",
    ],
  },
};

export function planLabel(plan: PlanId): string {
  return PLAN_CATALOG[plan]?.name ?? plan;
}

export const PLAN_ORDER: PlanId[] = ["FREE", "PRO", "ENTERPRISE"];

export const API_KEY_PLANS: PlanId[] = ["PRO", "ENTERPRISE"];
