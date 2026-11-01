"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePageButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("确定删除此未发布页面及其页面修订？被引用的 Chunk 不会删除。")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/cms/pages/${pageId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        setError(`删除失败：${result.error ?? response.status}`);
        return;
      }
      router.push("/cms/pages");
      router.refresh();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="delete-action">
      <button className="button danger" disabled={busy} onClick={remove}>
        {busy ? "正在删除…" : "删除未发布页面"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
