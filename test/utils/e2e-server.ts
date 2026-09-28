import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

const TEST_PORT = 3100;
const READY_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 250;

export const baseUrl = `http://localhost:${TEST_PORT}/api/v1`;

let serverProcess: ChildProcess | null = null;
let serverOutput = '';

async function waitUntilReady(): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // server not accepting connections yet, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Server did not become ready in time');
}

/**
 * Runs the actual compiled server (dist/main.js) as a child process and
 * waits for it to accept requests. Tests exercise it over real HTTP,
 * matching exactly how it runs in production/dev — see PROJECT_PLAN.md
 * notes on the vitest/vite-node + pg enum-introspection incompatibility
 * that made an in-process NestJS TestingModule unreliable in this repo.
 */
export async function startTestServer(): Promise<void> {
  serverOutput = '';
  serverProcess = spawn('node', ['--enable-source-maps', 'dist/main'], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      // Force the deterministic MockStudentSyncProvider regardless of what
      // .env has configured for the live external system — e2e tests must
      // stay isolated from it (no real OTP emails, no dependency on its
      // uptime/test data).
      EXTERNAL_STUDENT_SYSTEM_BASE_URL: '',
      EXTERNAL_STUDENT_SYSTEM_API_KEY: '',
      // Zero out the commission return-window hold so entries are
      // immediately releasable to EARNED in tests, instead of waiting
      // real days — see CommissionService.recordEntry.
      COMMISSION_HOLD_WINDOW_DAYS: '0',
    },
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  serverProcess.stdout?.on('data', (chunk: Buffer) => {
    serverOutput += chunk.toString();
  });

  await waitUntilReady();
}

export function stopTestServer(): void {
  serverProcess?.kill();
  serverProcess = null;
}

/**
 * Reads the last OTP code the stubbed ConsoleOtpProvider logged for the
 * given identifier (email/phone) — used by tests since delivery is a stub,
 * not a real email/SMS inbox we could otherwise check.
 */
export function getLastOtpCode(identifier: string): string {
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`OTP for ${escapedIdentifier} \\([^)]+\\): (\\d{6})`, 'g');
  const matches = [...serverOutput.matchAll(pattern)];

  const lastMatch = matches.at(-1);
  if (!lastMatch) {
    throw new Error(`No OTP found in server output for identifier "${identifier}"`);
  }

  return lastMatch[1];
}
