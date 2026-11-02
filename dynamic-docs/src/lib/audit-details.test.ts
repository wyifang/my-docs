import assert from "node:assert/strict";
import test from "node:test";
import { formatAuditDetails } from "@/lib/audit-details";

test("audit details retain ordinary fields and redact credential-like keys recursively", () => {
  const formatted = formatAuditDetails(JSON.stringify({
    role: "VIEWER",
    organizationId: "sample-customer",
    accessToken: "sensitive-value",
    nested: { passwordHash: "another-sensitive-value" },
  }));
  assert.match(formatted, /"role": "VIEWER"/);
  assert.match(formatted, /"organizationId": "sample-customer"/);
  assert.equal(formatted.includes("sensitive-value"), false);
  assert.equal((formatted.match(/\[REDACTED\]/g) ?? []).length, 2);
});

test("malformed audit details produce an explicit safe message", () => {
  assert.equal(formatAuditDetails("{broken"), "审计详情格式无效");
});
