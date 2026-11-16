import type { Verdict } from "./types";

export interface VerdictMeta {
  label: string;
  short: string;
  description: string;
  tone: "success" | "warning" | "danger";
  color: string;
}

export const VERDICTS: Record<Verdict, VerdictMeta> = {
  LIKELY_REAL: {
    label: "Likely authentic",
    short: "Authentic",
    description: "The sampled frames show few manipulation signals. This is not a guarantee.",
    tone: "success",
    color: "#10b981",
  },
  UNCERTAIN: {
    label: "Uncertain",
    short: "Uncertain",
    description: "Signals are mixed or weak. Treat the result as inconclusive and review the evidence.",
    tone: "warning",
    color: "#f59e0b",
  },
  LIKELY_FAKE: {
    label: "Likely manipulated",
    short: "Manipulated",
    description: "The sampled frames show strong manipulation signals. Corroborate before acting.",
    tone: "danger",
    color: "#f43f5e",
  },
};

export function verdictMeta(verdict: Verdict | string): VerdictMeta {
  return VERDICTS[verdict as Verdict] ?? VERDICTS.UNCERTAIN;
}

export function scoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 70) return "danger";
  if (score >= 40) return "warning";
  return "success";
}

export const DISCLAIMER =
  "Deepfake detection is probabilistic. A score is not proof that media is authentic or manipulated, and it should be combined with source verification and human review.";
