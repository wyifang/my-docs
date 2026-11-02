import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const LOGIN_FAILURE_LIMIT = 8;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

export function loginThrottleIdentifier(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function loginRetryAfterSeconds(
  failureCount: number,
  windowStartedAt: Date,
  now: Date = new Date(),
): number | null {
  if (failureCount < LOGIN_FAILURE_LIMIT) return null;
  const remainingMs = windowStartedAt.getTime() + LOGIN_FAILURE_WINDOW_MS - now.getTime();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : null;
}

export async function getLoginRetryAfter(email: string, now: Date = new Date()): Promise<number | null> {
  const cutoff = new Date(now.getTime() - LOGIN_FAILURE_WINDOW_MS);
  await db.loginThrottle.deleteMany({ where: { windowStartedAt: { lte: cutoff } } });

  const record = await db.loginThrottle.findUnique({
    where: { identifier: loginThrottleIdentifier(email) },
  });
  return record
    ? loginRetryAfterSeconds(record.failureCount, record.windowStartedAt, now)
    : null;
}

export async function recordLoginFailure(email: string, now: Date = new Date()): Promise<void> {
  const identifier = loginThrottleIdentifier(email);
  const cutoff = new Date(now.getTime() - LOGIN_FAILURE_WINDOW_MS);
  const reset = await db.loginThrottle.updateMany({
    where: { identifier, windowStartedAt: { lte: cutoff } },
    data: { windowStartedAt: now, failureCount: 1 },
  });
  if (reset.count > 0) return;

  await db.loginThrottle.upsert({
    where: { identifier },
    create: { identifier, windowStartedAt: now, failureCount: 1 },
    update: { failureCount: { increment: 1 } },
  });
}

export async function clearLoginFailures(email: string): Promise<void> {
  await db.loginThrottle.deleteMany({
    where: { identifier: loginThrottleIdentifier(email) },
  });
}
