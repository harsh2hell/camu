import http from 'node:http';
import { app } from '../app.js';
import { logger } from '../lib/logger.js';
import { authService } from '../services/auth.service.js';

interface LoadTestStats {
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  rps: number;
  latenciesMs: number[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  memoryBeforeMb: number;
  memoryAfterMb: number;
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function runScenario(
  serverPort: number,
  sessionToken: string,
  totalRequests: number,
  concurrency: number
): Promise<LoadTestStats> {
  const memBefore = process.memoryUsage().rss / (1024 * 1024);
  const latencies: number[] = [];
  let completed = 0;
  let successful = 0;
  let failed = 0;

  // Mix of pilot endpoints
  const endpoints = [
    '/api/health',
    '/api/attendance/my-summary',
    '/api/notifications',
    '/api/notices',
    '/api/profile/me',
  ];

  const startTime = Date.now();

  const makeRequest = (): Promise<void> => {
    return new Promise((resolve) => {
      const endpoint = endpoints[completed % endpoints.length];
      const reqStart = Date.now();

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path: endpoint,
          method: 'GET',
          headers: {
            Cookie: `dbs_session=${sessionToken}`,
            'X-Forwarded-For': '127.0.0.1',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            const duration = Date.now() - reqStart;
            latencies.push(duration);
            completed++;
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
              successful++;
            } else {
              failed++;
            }
            resolve();
          });
        }
      );

      req.on('error', () => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        completed++;
        failed++;
        resolve();
      });

      req.end();
    });
  };

  // Run in worker batches according to concurrency
  let inFlight = 0;
  let requestsLaunched = 0;

  await new Promise<void>((resolveAll) => {
    const launchNext = () => {
      while (inFlight < concurrency && requestsLaunched < totalRequests) {
        requestsLaunched++;
        inFlight++;
        makeRequest().then(() => {
          inFlight--;
          if (completed >= totalRequests) {
            resolveAll();
          } else {
            launchNext();
          }
        });
      }
    };
    launchNext();
  });

  const durationMs = Date.now() - startTime;
  const sorted = [...latencies].sort((a, b) => a - b);
  const memAfter = process.memoryUsage().rss / (1024 * 1024);

  const sum = sorted.reduce((acc, v) => acc + v, 0);

  return {
    concurrency,
    totalRequests,
    successfulRequests: successful,
    failedRequests: failed,
    durationMs,
    rps: Math.round((totalRequests / (durationMs / 1000)) * 100) / 100,
    latenciesMs: sorted,
    p50: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
    avg: Math.round((sum / sorted.length) * 100) / 100,
    memoryBeforeMb: Math.round(memBefore * 100) / 100,
    memoryAfterMb: Math.round(memAfter * 100) / 100,
  };
}

import os from 'node:os';

async function main() {
  const cpus = os.cpus();
  const totalMemGb = (os.totalmem() / (1024 ** 3)).toFixed(2);
  const freeMemGb = (os.freemem() / (1024 ** 3)).toFixed(2);

  logger.info('===============================================================');
  logger.info('   DBS CAMU-NEXT — REPRESENTATIVE PILOT LOAD TESTING HARNESS   ');
  logger.info('===============================================================');
  logger.info(`Host System: ${os.type()} ${os.release()} (${os.arch()})`);
  logger.info(`CPU Model: ${cpus[0]?.model || 'Generic'} (${cpus.length} logical cores)`);
  logger.info(`System RAM: ${totalMemGb} GB total (${freeMemGb} GB free)`);
  logger.info(`Node.js Runtime: ${process.version} | V8: ${process.versions.v8}`);
  logger.info(`PostgreSQL Pool Target: localhost:5432 (Pool capacity: 20 connections)`);
  logger.info('---------------------------------------------------------------');

  // 1. Start ephemeral HTTP server on random free port bound to 127.0.0.1
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const port = address.port;
  logger.info(`Bound test load server to http://127.0.0.1:${port}`);

  // 2. Authenticate student session for authentic session load
  const authRes = await authService.login(
    {
      identifier: 'student.dev@dgu.ac.in',
      password: 'Password@Dev123',
    },
    { ipAddress: '127.0.0.1', userAgent: 'Camu-LoadTest/1.0' }
  );

  const sessionToken = authRes.sessionToken;
  logger.info('Authenticated test session established for load testing');

  // 3. Dedicated Warm-Up Round (50 requests, concurrency 5)
  logger.info('Executing initial JIT / connection pool warm-up (50 requests @ 5 workers)...');
  await runScenario(port, sessionToken, 50, 5);
  logger.info('Warm-up complete. Commencing timed benchmark scenarios...');

  // 4. Test scenarios: Concurrency 5, 25, 50
  const scenarios = [
    { name: 'Baseline Concurrency (5 workers)', requests: 100, concurrency: 5 },
    { name: 'Representative Concurrency (25 workers)', requests: 400, concurrency: 25 },
    { name: 'Peak Pilot Concurrency (50 workers)', requests: 500, concurrency: 50 },
  ];

  const results: Record<string, LoadTestStats> = {};

  for (const sc of scenarios) {
    logger.info(`Running Scenario: ${sc.name} (${sc.requests} reqs, concurrency ${sc.concurrency})...`);
    const stats = await runScenario(port, sessionToken, sc.requests, sc.concurrency);
    results[sc.name] = stats;
    logger.info(`Result: ${stats.rps} req/sec | p50: ${stats.p50}ms | p95: ${stats.p95}ms | p99: ${stats.p99}ms | Error: ${stats.failedRequests}/${stats.totalRequests}`);
  }

  // 5. Output structured JSON for report evidence
  console.log('\n--- LOAD TEST FINAL SUMMARY (JSON) ---');
  console.log(JSON.stringify({
    hardware: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model,
      cpuCores: cpus.length,
      totalMemoryGb: totalMemGb,
    },
    scenarios: results,
  }, null, 2));

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
