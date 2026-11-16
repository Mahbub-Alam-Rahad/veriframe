import { Plan } from "@prisma/client";

export interface PlanDefinition {
  id: Plan;
  name: string;
  priceMonthly: number;
  monthlyAnalyses: number;
  maxUploadBytes: number;
  maxVideoSeconds: number;
  maxApiKeys: number;
  retentionDays: number;
  features: string[];
}

const MB = 1024 * 1024;
const envInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const PLAN_CATALOG: Record<Plan, PlanDefinition> = {
  FREE: {
    id: Plan.FREE,
    name: "Free",
    priceMonthly: 0,
    monthlyAnalyses: envInt(process.env.FREE_MONTHLY_ANALYSES, 3),
    maxUploadBytes: 100 * MB,
    maxVideoSeconds: 60,
    maxApiKeys: 1,
    retentionDays: 7,
    features: [
      "3 video analyses per month",
      "Up to 60 seconds per video",
      "Frame-level score and timeline",
      "PDF report download",
    ],
  },
  PRO: {
    id: Plan.PRO,
    name: "Pro",
    priceMonthly: 49,
    monthlyAnalyses: envInt(process.env.PRO_MONTHLY_ANALYSES, 100),
    maxUploadBytes: 500 * MB,
    maxVideoSeconds: 10 * 60,
    maxApiKeys: 10,
    retentionDays: 30,
    features: [
      "100 video analyses per month",
      "Up to 10 minutes per video",
      "Public API and API keys",
      "Priority queue",
      "30-day media retention",
    ],
  },
  ENTERPRISE: {
    id: Plan.ENTERPRISE,
    name: "Enterprise",
    priceMonthly: 0,
    monthlyAnalyses: envInt(process.env.ENTERPRISE_MONTHLY_ANALYSES, 2000),
    maxUploadBytes: 2 * 1024 * MB,
    maxVideoSeconds: 30 * 60,
    maxApiKeys: 50,
    retentionDays: 90,
    features: [
      "Volume analysis allowance",
      "Up to 30 minutes per video",
      "Model version selection and shadow runs",
      "Audit logs and team access",
      "Dedicated support and SLA",
    ],
  },
};

export const PLAN_ORDER: Plan[] = [Plan.FREE, Plan.PRO, Plan.ENTERPRISE];

export function getPlan(plan: Plan): PlanDefinition {
  return PLAN_CATALOG[plan] ?? PLAN_CATALOG.FREE;
}

export function effectiveUploadLimit(plan: Plan, absoluteMaxBytes: number): number {
  return Math.min(getPlan(plan).maxUploadBytes, absoluteMaxBytes);
}

export function effectiveRetentionDays(plan: Plan, envRetentionDays: number): number {
  const planDays = getPlan(plan).retentionDays;
  return envRetentionDays > 0 ? Math.min(planDays, envRetentionDays) : planDays;
}

export function planAllows(plan: Plan, feature: "api" | "priority"): boolean {
  if (feature === "api") return plan !== Plan.FREE;
  if (feature === "priority") return plan !== Plan.FREE;
  return false;
}

export function currentMonth(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
