import { BadRequestException } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  codec: string;
  container: string;
}

/**
 * Runs ffprobe with an argument array (never through a shell) and a hard timeout.
 * Treat all media as hostile input.
 */
export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        "-select_streams",
        "v:0",
        filePath,
      ],
      { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );

    const parsed = JSON.parse(stdout) as {
      format?: { duration?: string; format_name?: string };
      streams?: Array<{
        codec_name?: string;
        width?: number;
        height?: number;
        duration?: string;
        disposition?: { attached_pic?: number };
      }>;
    };

    const stream = parsed.streams?.find((item) => !item.disposition?.attached_pic);
    if (!stream || !stream.width || !stream.height) {
      throw new BadRequestException("The uploaded file does not contain a readable video stream");
    }

    const duration = Number.parseFloat(parsed.format?.duration ?? stream.duration ?? "0");
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException("Could not determine the video duration");
    }

    return {
      durationSeconds: Math.round(duration * 1000) / 1000,
      width: stream.width,
      height: stream.height,
      codec: stream.codec_name ?? "unknown",
      container: parsed.format?.format_name ?? "unknown",
    };
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException("The file could not be parsed as a valid video");
  }
}
