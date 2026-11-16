import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Plan } from "@prisma/client";
import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { ANALYSIS_QUEUE } from "./queue.module";

export interface AnalysisJob {
  videoId: string;
  userId: string;
  storageKey: string;
  requestedAt: string;
}

@Injectable()
export class QueueService {
  constructor(@InjectQueue(ANALYSIS_QUEUE) private readonly queue: Queue<AnalysisJob>) {}

  async enqueue(input: Omit<AnalysisJob, "requestedAt">, plan: Plan): Promise<string> {
    const job = await this.queue.add(
      "analyze-video",
      { ...input, requestedAt: new Date().toISOString() },
      {
        jobId: `${input.videoId}:${randomUUID()}`,
        priority: plan === Plan.FREE ? 10 : plan === Plan.PRO ? 5 : 1,
      },
    );
    return job.id ?? "unknown";
  }

  async counts() {
    return this.queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
  }

  async oldestWaitingAgeSeconds(): Promise<number | null> {
    const jobs = await this.queue.getJobs(["waiting"], 0, 1, true);
    if (jobs.length === 0) return null;
    return Math.max(0, Math.round((Date.now() - jobs[0].timestamp) / 1000));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.queue.getJobCounts("waiting");
      return true;
    } catch {
      return false;
    }
  }
}
