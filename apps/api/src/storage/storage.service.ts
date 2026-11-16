import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { AppConfiguration } from "../config/configuration";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly publicClient: S3Client;

  constructor(private readonly config: ConfigService<AppConfiguration, true>) {
    const storage = this.config.get("storage", { infer: true });

    const base = {
      region: storage.region,
      credentials: {
        accessKeyId: storage.accessKey,
        secretAccessKey: storage.secretKey,
      },
      forcePathStyle: storage.forcePathStyle,
    };

    this.bucket = storage.bucket;
    this.client = new S3Client({ ...base, endpoint: storage.endpoint });
    this.publicClient = new S3Client({ ...base, endpoint: storage.publicEndpoint });
  }

  async onModuleInit(): Promise<void> {
    // The compose stack provisions the bucket through minio-init. This also makes local
    // development less painful when storage is started by hand.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created object storage bucket "${this.bucket}"`);
      } catch (error) {
        this.logger.warn(
          `Could not verify bucket "${this.bucket}". Uploads will fail until storage is ready: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  buildVideoKey(userId: string, originalName: string): string {
    const ext = /\.([a-z0-9]{2,5})$/i.exec(originalName)?.[1]?.toLowerCase() ?? "bin";
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `videos/${userId}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
  }

  async putObject(options: {
    key: string;
    body: Buffer | Readable;
    contentType: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        ContentLength: options.contentLength,
        Metadata: options.metadata,
      }),
    );
  }

  async getObjectStream(key: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error(`Object ${key} has no body`);
    return result.Body as Readable;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix: string): Promise<number> {
    let continuationToken: string | undefined;
    let deleted = 0;

    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );
      const objects = (listed.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key))
        .map((Key) => ({ Key }));

      if (objects.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
        deleted += objects.length;
      }

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);

    return deleted;
  }

  async presignGet(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
