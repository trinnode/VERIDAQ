/**
 * utils/storage.ts
 *
 * Thin abstraction over file storage.
 * In dev we write to the local filesystem.
 * In prod we write to S3.
 *
 * The interface is intentionally simple: writeFileToStorage / readFileFromStorage.
 * The batch worker uses these to get uploaded Excel files into memory.
 */

import path from "node:path";
import fs   from "node:fs/promises";
import { env } from "../env.js";

// ─── Local driver ─────────────────────────────────────────────────────────

async function writeLocal(key: string, data: Buffer): Promise<void> {
  const fullPath = path.join(env.LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, data);
}

async function readLocal(key: string): Promise<Buffer> {
  const fullPath = path.join(env.LOCAL_STORAGE_DIR, key);
  return fs.readFile(fullPath);
}

async function deleteLocal(key: string): Promise<void> {
  const fullPath = path.join(env.LOCAL_STORAGE_DIR, key);
  await fs.unlink(fullPath).catch(() => { /* ignore if not found */ });
}

// ─── S3 driver ────────────────────────────────────────────────────────────
// Loaded lazily so the server starts fine without AWS credentials in dev

async function getS3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region:      env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId:     env.AWS_ACCESS_KEY ?? "",
      secretAccessKey: env.AWS_SECRET_KEY ?? "",
    },
  });
}

async function writeS3(key: string, data: Buffer): Promise<void> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key:    key,
    Body:   data,
  }));
}

async function readS3(key: string): Promise<Buffer> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  const response = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function deleteS3(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
}

// ─── Public interface ─────────────────────────────────────────────────────

function useS3(): boolean {
  return env.STORAGE_DRIVER === "s3";
}

export async function writeFileToStorage(key: string, data: Buffer): Promise<void> {
  return useS3() ? writeS3(key, data) : writeLocal(key, data);
}

export async function readFileFromStorage(key: string): Promise<Buffer> {
  return useS3() ? readS3(key) : readLocal(key);
}

export async function deleteFileFromStorage(key: string): Promise<void> {
  return useS3() ? deleteS3(key) : deleteLocal(key);
}
