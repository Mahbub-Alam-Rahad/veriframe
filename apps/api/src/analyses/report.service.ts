import { Injectable } from "@nestjs/common";
import { Analysis, Verdict, Video } from "@prisma/client";
import PDFDocument from "pdfkit";

type AnalysisWithVideo = Analysis & { video: Video };

@Injectable()
export class ReportService {
  async build(analysis: AnalysisWithVideo): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: "VeriFrame analysis report" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const details = (analysis.details ?? {}) as Record<string, unknown>;
    const flagged = (analysis.flaggedFrames as Array<{
      timestampSeconds?: number;
      score?: number;
      key?: string;
    }>) ?? [];

    doc.fillColor("#4f46e5").fontSize(10).text("VERIFRAME", { characterSpacing: 2 });
    doc.moveDown(0.4);
    doc.fillColor("#0f172a").fontSize(24).text("Deepfake analysis report");
    doc.moveDown(0.3);
    doc.fillColor("#64748b").fontSize(10).text(
      `Report generated ${new Date().toISOString()} · Analysis ${analysis.id}`,
    );

    doc.moveDown(1.2);
    doc.roundedRect(56, doc.y, 483, 116, 12).fillAndStroke("#f8fafc", "#e2e8f0");
    const boxTop = doc.y + 18;
    doc.fillColor("#64748b").fontSize(9).text("FAKE SCORE", 76, boxTop, { characterSpacing: 1 });
    doc.fillColor(scoreColor(analysis.fakeScore)).fontSize(42).text(`${analysis.fakeScore}`, 76, boxTop + 14);
    doc.fillColor("#0f172a").fontSize(18).text(verdictLabel(analysis.verdict), 190, boxTop + 14, {
      width: 320,
    });
    doc.fillColor("#475569").fontSize(10).text(
      `Probability ${(analysis.fakeProbability * 100).toFixed(1)}% · Confidence ${(analysis.confidence * 100).toFixed(1)}%`,
      190,
      boxTop + 44,
    );
    doc.fillColor("#475569").fontSize(10).text(
      `Model ${analysis.modelName} v${analysis.modelVersion} (${analysis.backend})`,
      190,
      boxTop + 60,
      { width: 330 },
    );

    doc.y = boxTop + 110;
    doc.fillColor("#0f172a").fontSize(13).text("Source media");
    doc.moveDown(0.4);
    const rows: Array<[string, string]> = [
      ["File", analysis.video.originalName],
      ["Duration", `${formatDuration(analysis.video.durationSeconds ?? 0)} (${analysis.video.durationSeconds?.toFixed(2) ?? "?"}s)`],
      ["Resolution", `${analysis.video.width ?? "?"} x ${analysis.video.height ?? "?"}`],
      ["Frames analyzed", String(analysis.framesAnalyzed)],
      ["Faces detected", String(analysis.facesDetected)],
      ["Temporal score", analysis.temporalScore === null ? "n/a" : (analysis.temporalScore * 100).toFixed(1) + "%"],
    ];
    for (const [label, value] of rows) {
      doc.fillColor("#64748b").fontSize(9.5).text(label, 56, doc.y, { width: 130, continued: true });
      doc.fillColor("#0f172a").fontSize(9.5).text(value, { width: 340 });
    }

    doc.moveDown(1.2);
    doc.fillColor("#0f172a").fontSize(13).text("Most suspicious frames");
    doc.moveDown(0.4);
    if (flagged.length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("No flagged frames were returned.");
    } else {
      flagged.slice(0, 10).forEach((frame, index) => {
        doc
          .fillColor("#334155")
          .fontSize(9.5)
          .text(
            `${index + 1}.  ${formatDuration(frame.timestampSeconds ?? 0)}  ·  frame score ${(
              (frame.score ?? 0) * 100
            ).toFixed(1)}%`,
          );
      });
    }

    doc.moveDown(1.2);
    doc.fillColor("#0f172a").fontSize(13).text("Method and limitations");
    doc.moveDown(0.4);
    doc
      .fillColor("#475569")
      .fontSize(9)
      .text(
        "Frames were sampled from the video, faces were detected and cropped where possible, and each crop was scored by a frame-level classifier. The video score aggregates the most suspicious frames and blends a temporal consistency signal. This is a probabilistic signal, not proof that media is authentic or manipulated. Compression, lighting, occlusion, new generators, and adversarial edits can all shift the result. Scores from different model versions are not directly comparable.",
        { width: 483, align: "justify", lineGap: 2 },
      );

    doc.moveDown(0.8);
    doc
      .fillColor("#94a3b8")
      .fontSize(8)
      .text(
        `Backend: ${String(details.backend ?? analysis.backend)} · Model id: ${String(details.modelId ?? "n/a")} · Sample rate: ${String(details.sampleFps ?? "n/a")} fps · Processing time: ${String(details.processingMs ?? "n/a")} ms · Calibration temperature: ${String(details.calibrationTemperature ?? "n/a")}`,
        { width: 483 },
      );

    doc.moveDown(1.4);
    doc.fillColor("#94a3b8").fontSize(8).text("VeriFrame · Self-hosted deepfake detection · veriframe.local", {
      width: 483,
      align: "center",
    });

    doc.end();
    return done;
  }
}

function verdictLabel(verdict: Verdict): string {
  if (verdict === "LIKELY_FAKE") return "Likely manipulated";
  if (verdict === "LIKELY_REAL") return "Likely authentic";
  return "Uncertain";
}

function scoreColor(score: number): string {
  if (score >= 70) return "#e11d48";
  if (score >= 30) return "#d97706";
  return "#059669";
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
