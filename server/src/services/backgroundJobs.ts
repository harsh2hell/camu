import { noticeService } from './notice.service.js';
import { logger } from '../lib/logger.js';

export interface BackgroundJobStatus {
  isRunning: boolean;
  intervalMs: number;
  lastNoticeRunAt: string | null;
  lastNoticeCount: number;
  lastNoticeError: string | null;
}

let noticeIntervalHandle: NodeJS.Timeout | null = null;
let isNoticeProcessing = false;

const jobStatus: BackgroundJobStatus = {
  isRunning: false,
  intervalMs: 60000, // 60-second default polling interval
  lastNoticeRunAt: null,
  lastNoticeCount: 0,
  lastNoticeError: null,
};

/**
 * Executes a single scheduled notice publishing cycle safely
 */
export async function runScheduledNoticeJob(): Promise<number> {
  if (isNoticeProcessing) {
    logger.debug('Scheduled notice processing already in progress, skipping cycle');
    return 0;
  }

  isNoticeProcessing = true;
  jobStatus.lastNoticeRunAt = new Date().toISOString();

  try {
    const processed = await noticeService.triggerScheduledProcessing();
    jobStatus.lastNoticeCount = processed;
    jobStatus.lastNoticeError = null;
    if (processed > 0) {
      logger.info(`[Background Job] Published ${processed} due scheduled notices`);
    }
    return processed;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    jobStatus.lastNoticeError = errorMsg;
    logger.error('[Background Job] Error during scheduled notice cycle:', { error: errorMsg });
    return 0;
  } finally {
    isNoticeProcessing = false;
  }
}

/**
 * Starts the in-process background worker daemon for single-instance pilot
 */
export function startBackgroundJobs(intervalMs: number = 60000): void {
  if (noticeIntervalHandle) {
    logger.warn('Background jobs already running');
    return;
  }

  jobStatus.isRunning = true;
  jobStatus.intervalMs = intervalMs;

  logger.info(`🚀 Starting background worker daemon (Interval: ${intervalMs}ms)`);

  // Run initial cycle immediately
  runScheduledNoticeJob().catch(() => {});

  // Recurring background interval
  noticeIntervalHandle = setInterval(() => {
    runScheduledNoticeJob().catch(() => {});
  }, intervalMs);

  // Unref timer so it doesn't hold open test processes
  if (noticeIntervalHandle && typeof noticeIntervalHandle.unref === 'function') {
    noticeIntervalHandle.unref();
  }
}

/**
 * Stops background worker gracefully during server shutdown
 */
export function stopBackgroundJobs(): void {
  if (noticeIntervalHandle) {
    clearInterval(noticeIntervalHandle);
    noticeIntervalHandle = null;
    jobStatus.isRunning = false;
    logger.info('🛑 Background worker daemon stopped gracefully');
  }
}

/**
 * Returns operational telemetry for health check endpoint
 */
export function getBackgroundJobStatus(): BackgroundJobStatus {
  return { ...jobStatus };
}
