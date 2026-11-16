import { HttpService } from "@nestjs/axios";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import type { AppConfiguration } from "../config/configuration";

export interface MlAnalyzeRequest {
  videoKey: string;
  bucket: string;
  videoId: string;
  userId: string;
  modelId: string;
  backend: "hf" | "mock";
  calibrationTemperature: number;
  sampleFps: number;
  maxFrames: number;
  maxDurationSeconds: number;
}

export interface MlFrameScore {
  index: number;
  timestampSeconds: number;
  score: number;
  faceDetected: boolean;
  box: [number, number, number, number] | null;
}

export interface MlFlaggedFrame extends MlFrameScore {
  key: string;
}

export interface MlAnalyzeResponse {
  fakeScore: number;
  fakeProbability: number;
  verdict: "LIKELY_REAL" | "UNCERTAIN" | "LIKELY_FAKE";
  confidence: number;
  temporalScore: number;
  facesDetected: number;
  framesAnalyzed: number;
  frameScores: MlFrameScore[];
  flaggedFrames: MlFlaggedFrame[];
  details: {
    backend: string;
    modelId: string;
    mock: boolean;
    sampleFps: number;
    durationSeconds: number;
    width: number;
    height: number;
    processingMs: number;
    calibrationTemperature: number;
    aggregation: string;
    disclaimer: string;
    warnings: string[];
  };
}

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly url: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor(
    private readonly http: HttpService,
    config: ConfigService<AppConfiguration, true>,
  ) {
    const ml = config.get("ml", { infer: true });
    this.url = ml.url.replace(/\/$/, "");
    this.token = ml.token;
    this.timeout = ml.timeoutMs;
  }

  async analyze(input: MlAnalyzeRequest): Promise<MlAnalyzeResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<MlAnalyzeResponse>(`${this.url}/v1/analyze`, input, {
          headers: { "x-internal-token": this.token },
          timeout: this.timeout,
        }),
      );
      return response.data;
    } catch (error) {
      const trace = error instanceof AxiosError ? error.response?.data : undefined;
      this.logger.error(
        `ML analysis failed for video ${input.videoId}: ${
          error instanceof Error ? error.message : String(error)
        } ${trace ? JSON.stringify(trace).slice(0, 500) : ""}`,
      );
      throw new ServiceUnavailableException("The analysis engine is temporarily unavailable");
    }
  }

  async health(): Promise<{ ok: boolean; backend?: string; model?: string; detail?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.url}/health`, { timeout: 5_000 }),
      );
      const data = response.data as {
        status?: string;
        backend?: string;
        model_id?: string;
      };
      return {
        ok: data.status === "ok",
        backend: data.backend,
        model: data.model_id,
      };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }
}
