import { z } from "zod";

const chunkDraftObjectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  contentType: z.enum([
    "api_operation",
    "api_parameter",
    "code_example",
    "warning",
    "troubleshooting",
    "concept",
  ]),
  language: z.enum(["zh-CN", "en-US"]),
  product: z.string().trim().min(1).max(100),
  apiVersion: z.string().trim().min(1).max(50),
  accessPolicy: z.enum(["PUBLIC", "AUTHENTICATED", "INTERNAL"]),
  allowedOrganizationIds: z
    .array(z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/))
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, "Organization IDs must be unique."),
  tags: z.array(z.string().trim().min(1).max(32)).max(20),
  allowedAgentScope: z.array(z.enum(["search", "read", "cite"])).max(3),
  lastVerified: z.iso.datetime().nullable(),
  deprecationStatus: z.enum(["active", "deprecated", "sunset"]),
  body: z.record(z.string(), z.unknown()),
});

export const chunkDraftSchema = chunkDraftObjectSchema.superRefine((value, context) => {
  const body = value.body;
  const requireText = (key: string) => {
    if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
      context.addIssue({
        code: "custom",
        path: ["body", key],
        message: `${key} is required for ${value.contentType}.`,
      });
    }
  };

  if (value.contentType === "api_operation") {
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(String(body.method).toUpperCase())) {
      context.addIssue({ code: "custom", path: ["body", "method"], message: "Use a supported HTTP method." });
    }
    requireText("path");
    if (typeof body.path === "string" && !body.path.startsWith("/")) {
      context.addIssue({ code: "custom", path: ["body", "path"], message: "API path must start with /." });
    }
    requireText("summary");
  } else if (value.contentType === "api_parameter") {
    requireText("name");
    requireText("type");
    requireText("location");
  } else if (value.contentType === "code_example") {
    requireText("code");
    requireText("language");
  } else if (value.contentType === "warning") {
    requireText("message");
  } else if (value.contentType === "troubleshooting") {
    requireText("problem");
    requireText("solution");
  } else {
    requireText("summary");
  }

  if (value.lastVerified && new Date(value.lastVerified).getTime() > Date.now()) {
    context.addIssue({
      code: "custom",
      path: ["lastVerified"],
      message: "Verification time cannot be in the future.",
    });
  }
  if (value.accessPolicy === "AUTHENTICATED" && value.allowedOrganizationIds.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["allowedOrganizationIds"],
      message: "Authenticated content must allow at least one organization.",
    });
  }
});

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

const userRoleSchema = z.enum(["ADMIN", "AUTHOR", "REVIEWER", "PUBLISHER", "VIEWER"]);

export const adminUserCreateSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(256),
  role: userRoleSchema,
  organizationId: z.string().trim().min(1).max(100).nullable(),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  role: userRoleSchema,
  organizationId: z.string().trim().min(1).max(100).nullable(),
  active: z.boolean(),
});

export const adminPasswordResetSchema = z.object({
  password: z.string().min(12).max(256),
});

export const adminOrganizationCreateSchema = z.object({
  id: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/),
  name: z.string().trim().min(1).max(200),
});

export const adminOrganizationUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  active: z.boolean(),
});

export const workflowSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit") }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("request_changes"), comment: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("withdraw") }),
]);

export const restoreRevisionSchema = z.object({
  sourceRevisionId: z.string().min(1).max(100),
});

export const pageDraftSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(1000),
  language: z.enum(["zh-CN", "en-US"]),
  product: z.string().trim().min(1).max(100),
  apiVersion: z.string().trim().min(1).max(50),
  chunkIds: z.array(z.string().min(1).max(100)).min(1).max(100)
    .refine((ids) => new Set(ids).size === ids.length, "Chunk IDs must be unique."),
});

export const linkTranslationSchema = z.object({
  otherContentId: z.string().min(1).max(100),
});

export type ChunkDraftInput = z.infer<typeof chunkDraftSchema>;
