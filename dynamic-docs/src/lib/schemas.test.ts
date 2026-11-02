import assert from "node:assert/strict";
import test from "node:test";
import {
  adminOrganizationCreateSchema,
  adminPasswordResetSchema,
  adminUserCreateSchema,
  adminUserUpdateSchema,
  chunkDraftSchema,
  loginSchema,
  pageDraftSchema,
} from "@/lib/schemas";
import { LOGIN_FAILURE_LIMIT, loginRetryAfterSeconds, loginThrottleIdentifier } from "@/lib/login-throttle";

test("login identifiers are normalized before validation", () => {
  const result = loginSchema.safeParse({ email: "  ADMIN@Example.com ", password: "pass" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.email, "admin@example.com");
});

test("login failure throttle blocks only after the threshold and expires with its window", () => {
  const now = new Date("2026-11-03T00:00:00.000Z");
  const startedAt = new Date(now.getTime() - 5 * 60 * 1000);
  assert.equal(loginRetryAfterSeconds(LOGIN_FAILURE_LIMIT - 1, startedAt, now), null);
  assert.equal(loginRetryAfterSeconds(LOGIN_FAILURE_LIMIT, startedAt, now), 600);
  assert.equal(loginRetryAfterSeconds(LOGIN_FAILURE_LIMIT, new Date(now.getTime() - 15 * 60 * 1000), now), null);
});

test("login throttle keys are stable and do not contain the email", () => {
  const identifier = loginThrottleIdentifier(" Admin@Example.com ");
  assert.equal(identifier, loginThrottleIdentifier("admin@example.com"));
  assert.equal(identifier.includes("@"), false);
});

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

test("admin user creation normalizes email and requires a strong initial password", () => {
  const parsed = adminUserCreateSchema.safeParse({
    email: " CUSTOMER@example.test ",
    name: "Customer",
    password: "a-unique-password",
    role: "VIEWER",
    organizationId: "sample-customer",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.email, "customer@example.test");
  assert.equal(adminUserCreateSchema.safeParse({
    email: "customer@example.test",
    name: "Customer",
    password: "short",
    role: "VIEWER",
    organizationId: null,
  }).success, false);
});

test("admin user updates reject unknown roles and require explicit account state", () => {
  assert.equal(adminUserUpdateSchema.safeParse({
    name: "Customer",
    role: "SUPERUSER",
    organizationId: null,
    active: true,
  }).success, false);
  assert.equal(adminUserUpdateSchema.safeParse({
    name: "Customer",
    role: "VIEWER",
    organizationId: null,
    active: true,
  }).success, true);
});

test("admin password reset requires an adequate password length", () => {
  assert.equal(adminPasswordResetSchema.safeParse({ password: "a-unique-password" }).success, true);
  assert.equal(adminPasswordResetSchema.safeParse({ password: "short" }).success, false);
  assert.equal(adminPasswordResetSchema.safeParse({ password: "x".repeat(257) }).success, false);
});

test("organization IDs are stable safe identifiers", () => {
  assert.equal(adminOrganizationCreateSchema.safeParse({
    id: "sample-customer.v2",
    name: "Sample Customer",
  }).success, true);
  assert.equal(adminOrganizationCreateSchema.safeParse({
    id: "../customer",
    name: "Sample Customer",
  }).success, false);
});
