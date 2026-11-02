import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDocumentQuality } from "@/lib/document-quality";
import type { DocumentQualityInput } from "@/lib/document-quality";

const now = new Date("2026-11-02T00:00:00.000Z");

const validChunk: DocumentQualityInput = {
  title: "Create a chat completion",
  contentType: "api_operation",
  language: "en-US",
  product: "MaaS",
  apiVersion: "v1",
  accessPolicy: "PUBLIC",
  allowedOrganizationIds: [],
  tags: ["chat", "api"],
  allowedAgentScope: ["search", "read"],
  lastVerified: "2026-10-01T00:00:00.000Z",
  deprecationStatus: "active",
  body: {
    method: "POST",
    path: "/v1/chat/completions",
    summary: "Creates a model response from a conversation.",
    constraints: ["The request must include at least one message."],
  },
};

test("a current, structured API chunk passes all quality checks", () => {
  const checks = evaluateDocumentQuality(validChunk, now);
  assert.equal(checks.length, 7);
  assert.ok(checks.every((check) => check.passed));
});

test("quality report identifies missing searchability, freshness, constraints, and replacement", () => {
  const chunk: DocumentQualityInput = {
    ...validChunk,
    tags: [],
    allowedAgentScope: ["read"],
    lastVerified: null,
    deprecationStatus: "deprecated",
    body: {
      ...validChunk.body,
      constraints: undefined,
    },
  };
  const checks = evaluateDocumentQuality(chunk, now);
  assert.equal(checks.find((check) => check.dimension === "Agent 可检索性")?.passed, false);
  assert.equal(checks.find((check) => check.dimension === "版本准确性与新鲜度")?.passed, false);
  assert.equal(checks.find((check) => check.dimension === "约束清晰度")?.passed, false);
  assert.equal(checks.find((check) => check.dimension === "弃用处理")?.passed, false);
});

test("stale verification dates and malformed content are reported without blocking drafts", () => {
  const chunk: DocumentQualityInput = {
    ...validChunk,
    lastVerified: "2024-01-01T00:00:00.000Z",
    body: { method: "TRACE", path: "not-an-api-path", summary: "" },
  };
  const checks = evaluateDocumentQuality(chunk, now);
  assert.equal(checks.find((check) => check.dimension === "结构有效性")?.passed, false);
  assert.equal(checks.find((check) => check.dimension === "版本准确性与新鲜度")?.passed, false);
});

test("sunset content passes deprecation checks only when a replacement is linked", () => {
  const chunk: DocumentQualityInput = {
    ...validChunk,
    deprecationStatus: "sunset",
    body: { ...validChunk.body, replacementChunkId: "chat-completions-v2" },
  };
  assert.equal(
    evaluateDocumentQuality(chunk, now).find((check) => check.dimension === "弃用处理")?.passed,
    true,
  );
});
