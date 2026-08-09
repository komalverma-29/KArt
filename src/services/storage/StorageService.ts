import { localStorageProvider } from "./LocalStorageProvider";

export interface StoredFile {
  url: string;
  storageKey: string;
}

export interface StorageProvider {
  save(input: { buffer: Buffer; originalFilename: string; mimeType: string }): Promise<StoredFile>;
  delete(storageKey: string): Promise<void>;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export class StorageValidationError extends Error {}

// Version 1 uses local disk storage. Swapping to Cloudinary/S3 later
// means implementing StorageProvider and changing this one line — no
// caller of StorageService changes (design.md §3.2, §13.4).
const activeProvider: StorageProvider = localStorageProvider;

export const StorageService = {
  async saveImage(input: { buffer: Buffer; originalFilename: string; mimeType: string }): Promise<StoredFile> {
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new StorageValidationError("Unsupported file type. Please upload a JPEG, PNG, or WebP image.");
    }
    if (input.buffer.byteLength === 0) {
      throw new StorageValidationError("The uploaded file is empty.");
    }
    if (input.buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new StorageValidationError("The uploaded file exceeds the maximum size of 8MB.");
    }

    return activeProvider.save(input);
  },

  async delete(storageKey: string): Promise<void> {
    await activeProvider.delete(storageKey);
  },
};