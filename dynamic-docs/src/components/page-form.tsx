"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type PageValues = {
  slug?: string;
  title: string;
  summary: string;
  language: string;
  product: string;
  apiVersion: string;
  chunkIds: string[];
};

export function PageForm({ pageId, initial }: { pageId?: string; initial?: PageValues }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(pageId ? {} : { slug: String(form.get("slug") ?? "") }),
      title: form.get("title"),
      summary: form.get("summary"),
      language: form.get("language"),
      product: form.get("product"),
      apiVersion: form.get("apiVersion"),
      chunkIds: String(form.get("chunkIds") ?? "")
        .split(/[\n,]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    };
    try {
      const response = await fetch(
        pageId ? `/api/cms/pages/${pageId}/revisions` : "/api/cms/pages",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(`保存失败：${result.error ?? response.status}`);
        return;
      }
      router.push(pageId ? `/cms/pages/${pageId}` : `/cms/pages/${result.pageId}`);
      router.refresh();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form editor-form" onSubmit={submit}>
      {!pageId && (
        <label>页面路径（英文小写和连字符）
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} defaultValue={initial?.slug} placeholder="例如：getting-started" />
        </label>
      )}
      <label>页面标题<input name="title" required maxLength={200} defaultValue={initial?.title} /></label>
      <label>页面摘要<textarea name="summary" rows={3} maxLength={1000} defaultValue={initial?.summary} /></label>
      <div className="form-grid">
        <label>语言
          <select name="language" defaultValue={initial?.language ?? "zh-CN"}>
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
        <label>产品<input name="product" required maxLength={100} defaultValue={initial?.product ?? "MaaS"} /></label>
        <label>API 版本<input name="apiVersion" required maxLength={50} defaultValue={initial?.apiVersion ?? "v1"} /></label>
      </div>
      <label>按顺序填写 Chunk ID（每行一个；只能引用你有权管理的同语言、同产品和 API 版本 Chunk）
        <textarea name="chunkIds" rows={5} required defaultValue={initial?.chunkIds.join("\n")} placeholder="粘贴 Chunk ID，每行一个" />
      </label>
      <p className="muted">页面按 Chunk ID 保存引用，不复制 Chunk 正文。Chunk 发布新修订后，已发布页面会按设定自动显示最新已发布修订。</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "正在保存…" : pageId ? "保存为新页面修订草稿" : "创建页面草稿"}
      </button>
    </form>
  );
}
