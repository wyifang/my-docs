"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type InitialChunk = {
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

const emptyChunk: InitialChunk = {
  title: "",
  contentType: "api_operation",
  language: "zh-CN",
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
    summary: "创建模型对话补全。",
    parameters: [],
    response: { type: "object" },
  },
};

export function ChunkForm({
  chunkId,
  initial,
}: {
  chunkId?: string;
  initial?: InitialChunk;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(String(form.get("body")));
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new Error("正文必须是 JSON 对象。");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "正文 JSON 格式无效。");
      setBusy(false);
      return;
    }

    const payload = {
      title: form.get("title"),
      contentType: form.get("contentType"),
      language: form.get("language"),
      product: form.get("product"),
      apiVersion: form.get("apiVersion"),
      accessPolicy: form.get("accessPolicy"),
      allowedOrganizationIds: String(form.get("allowedOrganizationIds") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      allowedAgentScope: form.getAll("allowedAgentScope"),
      lastVerified: form.get("lastVerified") ? new Date(String(form.get("lastVerified"))).toISOString() : null,
      deprecationStatus: form.get("deprecationStatus"),
      body,
    };

    try {
      const response = await fetch(
        chunkId ? `/api/cms/chunks/${chunkId}/revisions` : "/api/cms/chunks",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error === "FORBIDDEN" ? "当前账号无权执行此操作。" : "保存失败，请检查字段后重试。");
        return;
      }
      router.push(`/cms/chunks/${result.revision.chunkId}`);
      router.refresh();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  const value = initial ?? emptyChunk;
  return (
    <form className="form editor-form" onSubmit={submit}>
      <label>标题<input name="title" defaultValue={value.title} required maxLength={200} /></label>
      <div className="form-grid">
        <label>
          内容类型
          <select name="contentType" defaultValue={value.contentType}>
            <option value="api_operation">API 操作</option>
            <option value="api_parameter">API 参数</option>
            <option value="code_example">代码示例</option>
            <option value="warning">警告</option>
            <option value="troubleshooting">故障排查</option>
            <option value="concept">通用知识</option>
          </select>
        </label>
        <label>
          语言
          <select name="language" defaultValue={value.language}>
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
        <label>产品<input name="product" defaultValue={value.product} required maxLength={100} /></label>
        <label>API 版本<input name="apiVersion" defaultValue={value.apiVersion} required maxLength={50} /></label>
        <label>
          访问策略
          <select name="accessPolicy" defaultValue={value.accessPolicy}>
            <option value="PUBLIC">公开</option>
            <option value="AUTHENTICATED">登录用户</option>
            <option value="INTERNAL">内部</option>
          </select>
        </label>
        <label>
          弃用状态
          <select name="deprecationStatus" defaultValue={value.deprecationStatus}>
            <option value="active">Active</option>
            <option value="deprecated">Deprecated</option>
            <option value="sunset">Sunset</option>
          </select>
        </label>
      </div>
      <label>
        允许组织 ID（逗号分隔；登录可见内容必填）
        <input
          name="allowedOrganizationIds"
          defaultValue={value.allowedOrganizationIds.join(", ")}
          maxLength={2000}
          placeholder="例如：sample-customer"
        />
      </label>
      <label>
        标签（逗号分隔）
        <input name="tags" defaultValue={value.tags.join(", ")} maxLength={700} placeholder="例如：Chat, API" />
      </label>
      <fieldset>
        <legend>Agent 允许用途（不代表访问授权）</legend>
        {["search", "read", "cite"].map((scope) => (
          <label className="checkbox" key={scope}>
            <input
              type="checkbox"
              name="allowedAgentScope"
              value={scope}
              defaultChecked={value.allowedAgentScope.includes(scope)}
            />
            {scope}
          </label>
        ))}
      </fieldset>
      <label>最近验证日期（可选）<input name="lastVerified" type="date" defaultValue={value.lastVerified?.slice(0, 10) ?? ""} /></label>
      <label>
        结构化正文（JSON 对象）
        <textarea name="body" rows={14} defaultValue={JSON.stringify(value.body, null, 2)} spellCheck={false} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "正在保存…" : chunkId ? "保存为新修订草稿" : "创建首个草稿"}
      </button>
    </form>
  );
}
