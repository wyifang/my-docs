"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RestoreRevisionButton({
  chunkId,
  sourceRevisionId,
  sourceRevision,
}: {
  chunkId: string;
  sourceRevisionId: string;
  sourceRevision: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function restore() {
    if (!window.confirm(`将 r${sourceRevision} 的内容恢复为新的草稿修订？当前已发布版本不会改变。`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/cms/chunks/${chunkId}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceRevisionId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(`恢复失败：${result.error ?? response.status}`);
        return;
      }
      router.push(`/cms/chunks/${chunkId}`);
      router.refresh();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="restore-action">
      <button className="button secondary" type="button" disabled={busy} onClick={restore}>
        {busy ? "正在恢复…" : `恢复 r${sourceRevision} 为新草稿`}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
