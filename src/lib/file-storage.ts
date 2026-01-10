/**
 * File Storage Service
 *
 * Provides an abstraction for file storage operations.
 * Currently implements local filesystem storage.
 * Can be extended for cloud storage (S3, Cloudflare R2) in the future.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #2: Save uploaded avatar
 * @see AC #4: Delete avatar
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * File storage interface
 *
 * Abstraction for file storage operations.
 * Allows swapping implementations (local, S3, etc.) without changing calling code.
 */
export interface FileStorage {
  /**
   * Save a file to storage
   * @param filepath - Relative path within the upload directory
   * @param data - File data as Buffer
   */
  save(filepath: string, data: Buffer): Promise<void>;

  /**
   * Delete a file from storage
   * @param filepath - Relative path within the upload directory
   */
  delete(filepath: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param filepath - Relative path within the upload directory
   * @returns true if file exists, false otherwise
   */
  exists(filepath: string): Promise<boolean>;
}

/**
 * Upload directory base path
 * Files are stored in public/uploads for direct access via URL
 */
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Local filesystem implementation of FileStorage
 *
 * Stores files in the public/uploads directory.
 * Files are accessible via /uploads/* URL paths.
 */
export class LocalFileStorage implements FileStorage {
  /**
   * Save a file to the local filesystem
   *
   * Creates parent directories if they don't exist.
   * @param filepath - Relative path within uploads directory
   * @param data - File data as Buffer
   */
  async save(filepath: string, data: Buffer): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, filepath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, data);
  }

  /**
   * Delete a file from the local filesystem
   *
   * Silently ignores if file doesn't exist (idempotent).
   * @param filepath - Relative path within uploads directory
   */
  async delete(filepath: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, filepath);

    try {
      await fs.unlink(fullPath);
    } catch (error: unknown) {
      // Ignore if file doesn't exist (ENOENT)
      // Re-throw any other errors
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if a file exists on the local filesystem
   *
   * @param filepath - Relative path within uploads directory
   * @returns true if file exists and is accessible, false otherwise
   */
  async exists(filepath: string): Promise<boolean> {
    const fullPath = path.join(UPLOAD_DIR, filepath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton file storage instance
 *
 * Use this instance throughout the application for file operations.
 * Currently uses LocalFileStorage, can be swapped for cloud storage.
 */
export const fileStorage = new LocalFileStorage();
