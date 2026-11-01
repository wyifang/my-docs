"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteChunkButton({ chunkId }: { chunkId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("删除此内容及其未发布修订？此操作无法撤销。")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/cms/chunks/${chunkId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        setError(`删除失败：${result.error ?? response.status}`);
        return;
      }
      router.push("/cms");
      router.refresh();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="delete-action">
      <button className="button danger" disabled={busy} onClick={remove}>删除未发布内容</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
