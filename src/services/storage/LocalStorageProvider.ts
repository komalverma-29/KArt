import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { StorageProvider, StoredFile } from "./StorageService";

// Stored outside `src`, never inside application source (tech.md §File Upload Security).
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const PUBLIC_PREFIX = "/uploads";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const localStorageProvider: StorageProvider = {
  async save({ buffer, mimeType }): Promise<StoredFile> {
    await mkdir(UPLOAD_ROOT, { recursive: true });

    // Original filename is never trusted or reused — new UUID-based
    // filename is generated (tech.md §File Upload Security).
    const extension = EXTENSION_BY_MIME[mimeType] ?? "";
    const storageKey = `${crypto.randomUUID()}${extension}`;
    await writeFile(path.join(UPLOAD_ROOT, storageKey), buffer);

    return { url: `${PUBLIC_PREFIX}/${storageKey}`, storageKey };
  },

  async delete(storageKey: string): Promise<void> {
    // path.basename strips any directory traversal attempt.
    const filePath = path.join(UPLOAD_ROOT, path.basename(storageKey));
    await unlink(filePath).catch(() => {
      // Already gone — deletion is idempotent.
    });
  },
};