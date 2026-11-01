"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkflowActions({
  revisionId,
  status,
  role,
  published,
}: {
  revisionId: string;
  status: string;
  role: string;
  published: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: string, comment?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/cms/revisions/${revisionId}/workflow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...(comment ? { comment } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(`操作失败：${result.error ?? response.status}`);
        return;
      }
      if (role === "REVIEWER" && ["approve", "request_changes"].includes(action)) {
        router.replace("/cms");
        return;
      }
      router.refresh();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  async function requestChanges() {
    const comment = window.prompt("请写明需要修改的内容：");
    if (comment?.trim()) await run("request_changes", comment.trim());
  }

  return (
    <div className="workflow">
      {["AUTHOR", "ADMIN"].includes(role) && ["DRAFT", "CHANGES_REQUESTED"].includes(status) && (
        <button className="button secondary" disabled={busy} onClick={() => run("submit")}>提交审核</button>
      )}
      {["REVIEWER", "ADMIN"].includes(role) && status === "IN_REVIEW" && (
        <>
          <button className="button secondary" disabled={busy} onClick={() => run("approve")}>批准</button>
          <button className="button danger" disabled={busy} onClick={requestChanges}>要求修改</button>
        </>
      )}
      {["PUBLISHER", "ADMIN"].includes(role) && status === "APPROVED" && !published && (
        <button className="button" disabled={busy} onClick={() => run("publish")}>发布此版本</button>
      )}
      {["PUBLISHER", "ADMIN"].includes(role) && published && (
        <button className="button danger" disabled={busy} onClick={() => run("withdraw")}>撤回发布</button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
