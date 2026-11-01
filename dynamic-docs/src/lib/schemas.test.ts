import assert from "node:assert/strict";
import test from "node:test";
import { chunkDraftSchema, pageDraftSchema } from "@/lib/schemas";

const validApiChunk = {
  title: "Create chat completion",
  contentType: "api_operation",
  language: "en-US",
  product: "MaaS",
  apiVersion: "v1",
  accessPolicy: "PUBLIC",
  allowedOrganizationIds: [],
  tags: ["API"],
  allowedAgentScope: ["search", "read", "cite"],
  lastVerified: null,
  deprecationStatus: "active",
  body: {
    method: "POST",
    path: "/v1/chat/completions",
    summary: "Creates a model response.",
  },
} as const;

test("accepts a structurally valid API operation chunk", () => {
  assert.equal(chunkDraftSchema.safeParse(validApiChunk).success, true);
});

test("rejects API operations missing required fields", () => {
  const result = chunkDraftSchema.safeParse({
    ...validApiChunk,
    body: { method: "TRACE", path: "chat", summary: "" },
  });
  assert.equal(result.success, false);
});

test("rejects an unknown audience access policy", () => {
  const result = chunkDraftSchema.safeParse({
    ...validApiChunk,
    accessPolicy: "EVERYONE",
  });
  assert.equal(result.success, false);
});

test("rejects an unsupported language", () => {
  const result = chunkDraftSchema.safeParse({
    ...validApiChunk,
    language: "fr-FR",
  });
  assert.equal(result.success, false);
});

test("rejects organization-scoped content without an organization allowlist", () => {
  const result = chunkDraftSchema.safeParse({
    ...validApiChunk,
    accessPolicy: "AUTHENTICATED",
  });
  assert.equal(result.success, false);
});

test("accepts a page draft with ordered reusable Chunk references", () => {
  const result = pageDraftSchema.safeParse({
    slug: "chat-guide",
    title: "Chat API guide",
    summary: "Build a chat request.",
    language: "en-US",
    product: "MaaS",
    apiVersion: "v1",
    chunkIds: ["chunk-operation", "chunk-example"],
  });
  assert.equal(result.success, true);
});

test("rejects duplicate Chunk references and invalid page slugs", () => {
  const input = {
    slug: "Chat Guide",
    title: "Chat API guide",
    summary: "",
    language: "en-US",
    product: "MaaS",
    apiVersion: "v1",
    chunkIds: ["chunk-operation", "chunk-operation"],
  };
  assert.equal(pageDraftSchema.safeParse(input).success, false);
  assert.equal(pageDraftSchema.safeParse({ ...input, slug: "chat-guide", chunkIds: ["chunk-operation"] }).success, true);
});
