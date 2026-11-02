import { chunkDraftSchema } from "@/lib/schemas";

export type QualityCheck = {
  dimension: string;
  passed: boolean;
  message: string;
};

export type DocumentQualityInput = {
  title: string;
  contentType: string;
  language: string;
  product: string;
  apiVersion: string;
  accessPolicy: string;
  allowedOrganizationIds: string[];
  tags: string[];
  allowedAgentScope: string[];
  lastVerified: string | null;
  deprecationStatus: string;
  body: Record<string, unknown>;
};

const freshnessWindowMs = 365 * 24 * 60 * 60 * 1000;

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(hasValue);
  }
  return value !== null && value !== undefined;
}

export function evaluateDocumentQuality(
  input: DocumentQualityInput,
  now = new Date(),
): QualityCheck[] {
  const validation = chunkDraftSchema.safeParse(input);
  const body = input.body;
  const humanReadable = ["summary", "description", "message", "problem", "solution"]
    .some((key) => {
      const value = body[key];
      return typeof value === "string" && Boolean(value.trim());
    });
  const searchable = input.tags.length > 0 && input.allowedAgentScope.includes("search");
  const verifiedAt = input.lastVerified ? Date.parse(input.lastVerified) : Number.NaN;
  const fresh =
    Number.isFinite(verifiedAt) &&
    verifiedAt <= now.getTime() &&
    now.getTime() - verifiedAt <= freshnessWindowMs;
  const constraintsDocumented = ["prerequisites", "constraints", "limitations"]
    .some((key) => hasValue(body[key]));
  const replacementReference =
    (typeof body.supersedes === "string" && Boolean(body.supersedes.trim())) ||
    (typeof body.replacementChunkId === "string" && Boolean(body.replacementChunkId.trim()));
  const replacementDocumented =
    input.deprecationStatus === "active" ||
    replacementReference;
  const accessPolicyValid =
    input.accessPolicy === "PUBLIC" ||
    input.accessPolicy === "INTERNAL" ||
    (input.accessPolicy === "AUTHENTICATED" && input.allowedOrganizationIds.length > 0);

  return [
    {
      dimension: "结构有效性",
      passed: validation.success,
      message: validation.success
        ? "内容符合当前 Chunk Schema。"
        : `Schema 校验未通过：${validation.error.issues.slice(0, 3).map((issue) => issue.message).join("；")}`,
    },
    {
      dimension: "人类可读性",
      passed: humanReadable,
      message: humanReadable
        ? "正文包含摘要、说明、问题或解决方案等解释性文字。"
        : "建议添加 summary、description、message、problem 或 solution 等解释性文字。",
    },
    {
      dimension: "Agent 可检索性",
      passed: searchable,
      message: searchable
        ? "已配置标签并允许 Agent 搜索。"
        : "建议至少添加一个标签，并在允许 Agent 使用时配置 search scope。",
    },
    {
      dimension: "版本准确性与新鲜度",
      passed: fresh,
      message: fresh
        ? "最近验证时间在过去 365 天内。"
        : "最近验证时间缺失、位于未来或已超过 365 天。",
    },
    {
      dimension: "约束清晰度",
      passed: constraintsDocumented,
      message: constraintsDocumented
        ? "正文记录了前置条件、约束或限制。"
        : "建议在 prerequisites、constraints 或 limitations 中说明适用前提和限制。",
    },
    {
      dimension: "弃用处理",
      passed: replacementDocumented,
      message: replacementDocumented
        ? "弃用状态为 active，或已填写替代 Chunk 引用。"
        : "弃用或 sunset 内容应在 supersedes 或 replacementChunkId 中指向替代内容。",
    },
    {
      dimension: "访问控制",
      passed: accessPolicyValid,
      message:
        accessPolicyValid
          ? "访问策略与组织范围配置一致。"
          : "访问策略无效，或组织受限内容未指定允许访问的组织。",
    },
  ];
}
