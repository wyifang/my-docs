import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  clearLoginFailures,
  getLoginRetryAfter,
  LOGIN_FAILURE_LIMIT,
  recordLoginFailure,
} from "@/lib/login-throttle";

test("login failures persist across requests and clear after a successful login", async () => {
  const email = `login-throttle-${randomUUID()}@example.test`;
  const now = new Date();
  try {
    for (let attempt = 0; attempt < LOGIN_FAILURE_LIMIT; attempt += 1) {
      await recordLoginFailure(email, now);
    }

    assert.equal(await getLoginRetryAfter(email, now), 15 * 60);
    await clearLoginFailures(email);
    assert.equal(await getLoginRetryAfter(email, now), null);
  } finally {
    await clearLoginFailures(email);
  }
});
