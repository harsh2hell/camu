import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BadRequestError, ForbiddenError, NotFoundError, ServiceUnavailableError, AppError } from '../errors/AppError.js';
import { config } from '../config/env.js';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.zip', '.docx', '.txt', '.py', '.java', '.cpp', '.sql', '.png', '.jpg', '.jpeg'
]);

export interface UploadedFileMetadata {
  fileKey: string;
  originalName: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
  mimeType: string;
}

// In-memory upload registry for tracking ownership of staged uploads (cached / fallback)
const uploadRegistry = new Map<string, UploadedFileMetadata>();

/**
 * Validates buffer size, extension, and content magic bytes
 */
export function validateFileBuffer(buffer: Buffer, fileName: string): { ext: string; sanitizedName: string } {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(`File size exceeds 10MB limit (received: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`);
  }

  if (buffer.length === 0) {
    throw new BadRequestError('Uploaded file is empty (0 bytes).');
  }

  const sanitizedName = path.basename(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const ext = path.extname(sanitizedName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestError(
      `File extension '${ext}' is not permitted. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
    );
  }

  // 1. Prohibit dangerous binary executable signatures regardless of declared extension
  // Windows PE / EXE / DLL: starts with 'MZ' (0x4D, 0x5A)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new BadRequestError('Executable file formats (Windows PE/EXE/DLL) are strictly prohibited.');
  }

  // Linux ELF executable: starts with 0x7F, 'E', 'L', 'F'
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    throw new BadRequestError('Executable file formats (Linux ELF) are strictly prohibited.');
  }

  // macOS Mach-O executable signatures
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa) ||
      (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
      (buffer[0] === 0xce && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe))
  ) {
    throw new BadRequestError('Executable file formats (Mach-O binaries) are strictly prohibited.');
  }

  // 2. Validate magic bytes per declared extension
  if (ext === '.pdf') {
    // Must start with '%PDF-'
    const magic = buffer.subarray(0, 5).toString('ascii');
    if (magic !== '%PDF-') {
      throw new BadRequestError('File content does not match .pdf format (invalid PDF magic header).');
    }
  } else if (ext === '.png') {
    // Must start with 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    if (!isPng) {
      throw new BadRequestError('File content does not match .png format (invalid PNG magic header).');
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    // Must start with 0xFF, 0xD8, 0xFF
    const isJpg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    if (!isJpg) {
      throw new BadRequestError('File content does not match JPEG format (invalid JPEG magic header).');
    }
  } else if (ext === '.zip' || ext === '.docx') {
    // Must start with PK\x03\x04
    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;
    if (!isZip) {
      throw new BadRequestError(`File content does not match ${ext} archive format (invalid PK zip header).`);
    }
  } else if (['.txt', '.py', '.java', '.cpp', '.sql'].includes(ext)) {
    // Source code / plain text: check for illegal null bytes (binary disguised as code)
    for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
      if (buffer[i] === 0x00) {
        throw new BadRequestError(
          `File content for '${ext}' contains illegal null bytes; binary files cannot be disguised as source code.`
        );
      }
    }
  }

  return { ext, sanitizedName };
}

/**
 * Returns absolute storage directory and ensures it exists
 */
export function getUploadDirectory(): string {
  const dir = path.isAbsolute(config.UPLOAD_DIR)
    ? config.UPLOAD_DIR
    : path.join(process.cwd(), config.UPLOAD_DIR);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Saves file buffer to disk with server-generated UUID name and non-executable mode,
 * and records durable ownership in PostgreSQL.
 */
export async function saveSecureFile(
  buffer: Buffer,
  ext: string,
  sanitizedName: string,
  uploadedBy: string,
  mimeType = 'application/octet-stream'
): Promise<UploadedFileMetadata> {
  const uploadDir = getUploadDirectory();
  const fileKey = `${crypto.randomUUID()}${ext}`;
  const targetPath = path.join(uploadDir, fileKey);

  // Write with non-executable permissions (0o600: user read/write only)
  await fs.promises.writeFile(targetPath, buffer, { mode: 0o600 });

  const metadata: UploadedFileMetadata = {
    fileKey,
    originalName: sanitizedName,
    sizeBytes: buffer.length,
    uploadedBy,
    uploadedAt: new Date(),
    mimeType,
  };

  // Cache in-memory
  uploadRegistry.set(fileKey, metadata);

  // Durable ownership record in PostgreSQL
  try {
    await prisma.uploadedFile.upsert({
      where: { fileKey },
      update: {
        originalName: sanitizedName,
        sizeBytes: buffer.length,
        mimeType,
        uploadedById: uploadedBy,
      },
      create: {
        fileKey,
        originalName: sanitizedName,
        sizeBytes: buffer.length,
        mimeType,
        uploadedById: uploadedBy,
      },
    });
  } catch (err) {
    logger.error('Failed to persist file ownership record in database:', {
      fileKey,
      uploadedBy,
      error: err instanceof Error ? err.message : String(err),
    });
    // Remove written file from disk and clear in-memory cache to prevent untracked orphans
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath).catch(() => {});
    }
    uploadRegistry.delete(fileKey);
    throw new ServiceUnavailableError('Database service unavailable to persist file ownership.');
  }

  return metadata;
}

/**
 * Verifies upload ownership durably in PostgreSQL across restarts and instances.
 * If the database is unavailable, FAILS CLOSED with ServiceUnavailableError (503).
 * If the file key is unknown, FAILS CLOSED with NotFoundError (404).
 * If the file belongs to a different user, FAILS CLOSED with ForbiddenError (403).
 */
export async function verifyUploadOwnership(fileKeyOrUrl: string, userId: string): Promise<void> {
  // Extract pure fileKey if a URL/path was supplied
  const fileKey = path.basename(fileKeyOrUrl);

  // 1. Fast in-memory check for mismatched ownership (defense-in-depth)
  const cached = uploadRegistry.get(fileKey);
  if (cached && cached.uploadedBy !== userId) {
    throw new ForbiddenError('You are not authorized to attach files uploaded by another user.');
  }

  let dbRecord: { uploadedById: string } | null = null;
  let existingSub: { studentId: string } | null = null;
  let existingAssignment: { id: string } | null = null;

  // 2. Authoritative persistent database check
  try {
    dbRecord = await prisma.uploadedFile.findUnique({
      where: { fileKey },
      select: { uploadedById: true },
    });

    if (!dbRecord) {
      existingSub = await prisma.assignmentSubmission.findFirst({
        where: {
          submissionFileUrl: {
            contains: fileKey,
          },
        },
        select: { studentId: true },
      });
    }

    if (!dbRecord && !existingSub) {
      existingAssignment = await prisma.assignment.findFirst({
        where: {
          attachmentUrl: {
            contains: fileKey,
          },
        },
        select: { id: true },
      });
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Authoritative upload ownership verification failed due to database error; failing closed:', {
      fileKey,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    // FAIL CLOSED: Database unavailable
    throw new ServiceUnavailableError('Database service unavailable to verify file ownership.');
  }

  // 3. Evaluate database findings
  if (dbRecord) {
    if (dbRecord.uploadedById !== userId) {
      throw new ForbiddenError('You are not authorized to attach files uploaded by another user.');
    }
    return;
  }

  if (existingSub) {
    if (existingSub.studentId !== userId) {
      throw new ForbiddenError('You are not authorized to attach files uploaded by another user.');
    }
    return;
  }

  if (existingAssignment) {
    return;
  }

  // 4. Unknown file key: not found in uploaded_files, submissions, or assignments
  // Must fail closed rather than silently approving!
  throw new NotFoundError('Referenced upload file not found.');
}

/**
 * Resolves safe file path and verifies against path traversal
 */
export function getSafeFilePath(fileKeyOrUrl: string): string {
  const fileKey = path.basename(fileKeyOrUrl);
  // Ensure no path traversal characters
  if (fileKey.includes('..') || fileKey.includes('/') || fileKey.includes('\\')) {
    throw new BadRequestError('Invalid file key format.');
  }

  const uploadDir = getUploadDirectory();
  const filePath = path.join(uploadDir, fileKey);

  // Prevent directory traversal escape
  if (!filePath.startsWith(uploadDir)) {
    throw new ForbiddenError('Path traversal detected.');
  }

  return filePath;
}

/**
 * Maps extension to MIME type for safe download headers
 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.zip': return 'application/zip';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.py': return 'text/x-python';
    case '.java': return 'text/x-java-source';
    case '.cpp': return 'text/x-c++src';
    case '.sql': return 'application/sql';
    case '.txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

/**
 * Cleans up file from disk and database/registry
 */
export async function deleteSecureFile(fileKeyOrUrl: string): Promise<void> {
  try {
    const filePath = getSafeFilePath(fileKeyOrUrl);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    const fileKey = path.basename(fileKeyOrUrl);
    uploadRegistry.delete(fileKey);

    await prisma.uploadedFile.deleteMany({
      where: { fileKey },
    });
  } catch {
    // Ignore cleanup errors
  }
}

export interface CleanupOptions {
  gracePeriodHours?: number; // default: 24h
  dryRun?: boolean;          // default: false
}

export interface CleanupResult {
  scannedDbRecords: number;
  unreferencedDbRecords: number;
  deletedDbRecords: number;
  missingPhysicalRecordsPurged: number;
  scannedDiskFiles: number;
  deletedDiskFiles: number;
  retainedActiveFiles: number;
  errorsCount: number;
}

/**
 * Conservative file lifecycle cleanup:
 * - Never deletes files referenced by active assignments or submissions.
 * - Protects recent uploads with gracePeriodHours (default 24h) to avoid races with drafting.
 * - Purges unreferenced files older than gracePeriodHours.
 * - Cleans up missing physical file metadata records older than gracePeriodHours.
 * - Cleans up untracked physical files older than gracePeriodHours.
 * - Logs failures without exposing sensitive paths or personal data.
 */
export async function cleanupOrphanFiles(options: CleanupOptions = {}): Promise<CleanupResult> {
  const gracePeriodHours = options.gracePeriodHours ?? 24;
  const dryRun = options.dryRun ?? false;
  const cutoffDate = new Date(Date.now() - gracePeriodHours * 60 * 60 * 1000);

  const result: CleanupResult = {
    scannedDbRecords: 0,
    unreferencedDbRecords: 0,
    deletedDbRecords: 0,
    missingPhysicalRecordsPurged: 0,
    scannedDiskFiles: 0,
    deletedDiskFiles: 0,
    retainedActiveFiles: 0,
    errorsCount: 0,
  };

  const uploadDir = getUploadDirectory();
  const activeFileKeys = new Set<string>();

  // 1. Authoritative retrieval of all active submission and assignment attachments
  try {
    const activeSubmissions = await prisma.assignmentSubmission.findMany({
      where: { submissionFileUrl: { not: null } },
      select: { submissionFileUrl: true },
    });
    for (const sub of activeSubmissions) {
      if (sub.submissionFileUrl && !sub.submissionFileUrl.startsWith('http')) {
        activeFileKeys.add(path.basename(sub.submissionFileUrl));
      }
    }

    const activeAssignments = await prisma.assignment.findMany({
      where: { attachmentUrl: { not: null } },
      select: { attachmentUrl: true },
    });
    for (const a of activeAssignments) {
      if (a.attachmentUrl && !a.attachmentUrl.startsWith('http')) {
        activeFileKeys.add(path.basename(a.attachmentUrl));
      }
    }
  } catch (err) {
    logger.error('Failed to query active file references during cleanup; aborting cleanup to prevent accidental file loss:', {
      error: err instanceof Error ? err.message : String(err),
    });
    result.errorsCount++;
    return result;
  }

  result.retainedActiveFiles = activeFileKeys.size;

  // 2. Scan PostgreSQL uploaded_files records
  try {
    const dbRecords = await prisma.uploadedFile.findMany();
    result.scannedDbRecords = dbRecords.length;

    for (const record of dbRecords) {
      const isReferenced = activeFileKeys.has(record.fileKey);
      const isOlderThanGracePeriod = new Date(record.createdAt).getTime() < cutoffDate.getTime();
      const filePath = path.join(uploadDir, record.fileKey);
      const physicalExists = fs.existsSync(filePath);

      // Condition A: Physical file is missing from disk
      if (!physicalExists) {
        if (isOlderThanGracePeriod || !isReferenced) {
          result.missingPhysicalRecordsPurged++;
          if (!dryRun) {
            try {
              await prisma.uploadedFile.delete({ where: { id: record.id } });
              uploadRegistry.delete(record.fileKey);
            } catch (delErr) {
              logger.error('Failed to purge missing physical record from database:', {
                fileKey: record.fileKey,
                error: delErr instanceof Error ? delErr.message : String(delErr),
              });
              result.errorsCount++;
            }
          }
        }
        continue;
      }

      // Condition B: Unreferenced file older than grace period (orphaned staged upload or replaced file)
      if (!isReferenced && isOlderThanGracePeriod) {
        result.unreferencedDbRecords++;
        if (!dryRun) {
          try {
            await fs.promises.unlink(filePath).catch(() => {});
            await prisma.uploadedFile.delete({ where: { id: record.id } });
            uploadRegistry.delete(record.fileKey);
            result.deletedDbRecords++;
            result.deletedDiskFiles++;
          } catch (delErr) {
            logger.error('Failed to delete orphaned file or DB record during cleanup:', {
              fileKey: record.fileKey,
              error: delErr instanceof Error ? delErr.message : String(delErr),
            });
            result.errorsCount++;
          }
        }
      }
    }
  } catch (err) {
    logger.error('Error during uploaded_files database inspection in cleanup:', {
      error: err instanceof Error ? err.message : String(err),
    });
    result.errorsCount++;
  }

  // 3. Scan physical disk directory for untracked files (no metadata record, not active, older than grace period)
  try {
    if (fs.existsSync(uploadDir)) {
      const files = await fs.promises.readdir(uploadDir);
      result.scannedDiskFiles = files.length;

      for (const fileName of files) {
        if (fileName.startsWith('.')) continue;
        if (activeFileKeys.has(fileName)) continue;

        const filePath = path.join(uploadDir, fileName);
        try {
          const stats = await fs.promises.stat(filePath);
          const isOlderThanGracePeriod = stats.mtime.getTime() < cutoffDate.getTime();

          if (isOlderThanGracePeriod) {
            const dbCount = await prisma.uploadedFile.count({
              where: { fileKey: fileName },
            });

            if (dbCount === 0) {
              if (!dryRun) {
                await fs.promises.unlink(filePath);
                result.deletedDiskFiles++;
                uploadRegistry.delete(fileName);
              }
            }
          }
        } catch (statErr) {
          logger.error('Error stating file during orphan scan:', {
            fileKey: fileName,
            error: statErr instanceof Error ? statErr.message : String(statErr),
          });
          result.errorsCount++;
        }
      }
    }
  } catch (err) {
    logger.error('Error reading upload directory during physical cleanup scan:', {
      error: err instanceof Error ? err.message : String(err),
    });
    result.errorsCount++;
  }

  logger.info('File lifecycle cleanup completed:', {
    dryRun,
    gracePeriodHours,
    ...result,
  });

  return result;
}

export const FileStorage = {
  validateFileBuffer,
  saveSecureFile,
  verifyUploadOwnership,
  getSafeFilePath,
  getUploadDirectory,
  getMimeType,
  deleteSecureFile,
  cleanupOrphanFiles,
  uploadRegistry,
};
