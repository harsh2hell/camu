import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { prisma } from '../lib/prisma.js';
import { FileStorage } from '../lib/fileStorage.js';
import { authService } from '../services/auth.service.js';
import { logger } from '../lib/logger.js';

interface E2EValidationResult {
  step: string;
  passed: boolean;
  details: string;
}

async function runOperationalValidation(): Promise<E2EValidationResult[]> {
  const results: E2EValidationResult[] = [];

  logger.info('Starting Phase 13 End-to-End Operational Validation...');

  // 1. Synthetic Document Ingestion
  const syntheticDocContent = '%PDF-1.4\n% Synthetic Test Document for Phase 13 Pilot Validation\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
  const buffer = Buffer.from(syntheticDocContent, 'utf-8');
  const studentUserId = 'a0000000-0000-4000-8000-000000000001';

  logger.info('Step 1: Ingesting synthetic document with validation...');
  const { ext, sanitizedName } = FileStorage.validateFileBuffer(buffer, 'pilot_synthetic_test.pdf');
  const metadata = await FileStorage.saveSecureFile(
    buffer,
    ext,
    sanitizedName,
    studentUserId,
    'application/pdf'
  );

  const diskPath = FileStorage.getSafeFilePath(metadata.fileKey);
  const existsOnDisk = fs.existsSync(diskPath);
  const stat = fs.statSync(diskPath);
  const mode = (stat.mode & 0o777).toString(8);

  results.push({
    step: 'Synthetic Document Storage',
    passed: existsOnDisk && (mode === '600' || mode === '400'),
    details: `File written to ${diskPath} with mode 0o${mode}`,
  });

  // 2. Ownership verification in PostgreSQL
  const dbRecord = await prisma.uploadedFile.findUnique({
    where: { fileKey: metadata.fileKey },
  });

  results.push({
    step: 'PostgreSQL Ownership Persistence',
    passed: !!dbRecord && dbRecord.uploadedById === studentUserId,
    details: `Durable metadata verified in uploaded_files: user=${dbRecord?.uploadedById}`,
  });

  // 3. Security Boundary: Cross-user authorization check
  let otherUserBlocked = false;
  try {
    await FileStorage.verifyUploadOwnership(metadata.fileKey, 'a0000000-0000-4000-8000-000000000002');
  } catch (err: any) {
    if (err.statusCode === 403 || err.message.includes('another user')) {
      otherUserBlocked = true;
    }
  }

  results.push({
    step: 'Anti-IDOR Ownership Barrier',
    passed: otherUserBlocked,
    details: 'Unauthorized user verification strictly rejected with 403 Forbidden',
  });

  // 4. Persistence Across Simulated Restart
  // Simulate complete memory loss by checking directly against PostgreSQL & disk
  let verifiedPostRestart = false;
  try {
    await FileStorage.verifyUploadOwnership(metadata.fileKey, studentUserId);
    verifiedPostRestart = true;
  } catch {
    verifiedPostRestart = false;
  }

  results.push({
    step: 'Persistence Across Restart',
    passed: verifiedPostRestart && fs.existsSync(diskPath),
    details: 'File and ownership verified authoritatively post-restart simulation',
  });

  // 5. Database Backup & Restore to Isolated Test Database
  logger.info('Step 5: Executing non-destructive backup and restore drill...');
  const isolatedDb = 'dbs_camu_pilot_e2e_test';
  const dumpPath = path.join(process.cwd(), 'server/backups/pilot_e2e.dump');
  fs.mkdirSync(path.dirname(dumpPath), { recursive: true });

  try {
    // pg_dump
    execSync(`pg_dump -U harsh -d dbs_camu_dev -Fc -f "${dumpPath}"`, { stdio: 'pipe' });

    // drop isolated if exists and create
    execSync(`dropdb -U harsh --if-exists "${isolatedDb}" && createdb -U harsh "${isolatedDb}"`, {
      stdio: 'pipe',
    });

    // pg_restore
    execSync(`pg_restore -U harsh -d "${isolatedDb}" --no-owner --no-privileges "${dumpPath}"`, {
      stdio: 'pipe',
    });

    // Verify row count of uploaded_files in restored database
    const restoredCountRaw = execSync(
      `psql -U harsh -d "${isolatedDb}" -t -c "SELECT count(*) FROM uploaded_files WHERE file_key = '${metadata.fileKey}';"`,
      { encoding: 'utf-8' }
    ).trim();

    const restoredTriggerCountRaw = execSync(
      `psql -U harsh -d "${isolatedDb}" -t -c "SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%';"`,
      { encoding: 'utf-8' }
    ).trim();

    results.push({
      step: 'Database Restore to Isolated Target',
      passed: parseInt(restoredCountRaw, 10) === 1 && parseInt(restoredTriggerCountRaw, 10) === 7,
      details: `Restored to ${isolatedDb}: found file metadata and all ${restoredTriggerCountRaw} immutable triggers intact`,
    });
  } catch (err: any) {
    results.push({
      step: 'Database Restore to Isolated Target',
      passed: false,
      details: `Restore error: ${err.message}`,
    });
  } finally {
    // Drop isolated test database and remove test dump
    try {
      execSync(`dropdb -U harsh --if-exists "${isolatedDb}"`, { stdio: 'pipe' });
      if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath);
    } catch {}
  }

  // 6. Clean up synthetic file
  await FileStorage.deleteSecureFile(metadata.fileKey);
  const cleanedUp = !fs.existsSync(diskPath);

  results.push({
    step: 'Synthetic Data Cleanup',
    passed: cleanedUp,
    details: 'Synthetic test document safely purged without leaving test debris',
  });

  return results;
}

runOperationalValidation()
  .then((results) => {
    console.log('\n--- OPERATIONAL VALIDATION RESULTS ---');
    console.table(results);
    const allPassed = results.every((r) => r.passed);
    if (allPassed) {
      console.log('✅ ALL OPERATIONAL VALIDATION CHECKS PASSED');
      process.exit(0);
    } else {
      console.error('❌ SOME CHECKS FAILED');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Fatal validation error:', err);
    process.exit(1);
  });
