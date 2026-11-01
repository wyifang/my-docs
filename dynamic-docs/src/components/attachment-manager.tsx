"use client";

import { useState, type ChangeEvent } from "react";

type AttachmentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export function AttachmentManager({
  chunkId,
  initialAttachments,
  canDelete,
}: {
  chunkId: string;
  initialAttachments: AttachmentItem[];
  canDelete: boolean;
}) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch(`/api/cms/chunks/${chunkId}/attachments`, {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(`上传失败：${result.error ?? response.status}`);
        return;
      }
      setAttachments((items) => [result.attachment, ...items]);
      setMessage("附件已保存。公开可见需要在内容正文中引用附件 ID 并重新审核发布。");
    } catch {
      setMessage("无法连接服务，请确认应用正在运行。");
    } finally {
      input.value = "";
      setBusy(false);
    }
  }

  async function remove(attachmentId: string) {
    if (!window.confirm("确定删除此附件吗？")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/cms/chunks/${chunkId}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) {
        setMessage(`删除失败：${result.error ?? response.status}`);
        return;
      }
      setAttachments((items) => items.filter((item) => item.id !== attachmentId));
    } catch {
      setMessage("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="attachment-panel" aria-labelledby="attachments-title">
      <h3 id="attachments-title">附件</h3>
      <p className="muted">支持 PNG、JPEG、WebP 图片和 PDF，单个文件最大 5 MB。</p>
      <label className="upload-control">
        上传附件
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          disabled={busy}
          onChange={upload}
        />
      </label>
      {message && <p role="status" className="muted">{message}</p>}
      {attachments.length === 0 ? (
        <p className="muted">尚无附件。</p>
      ) : (
        <ul className="attachment-list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <a href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer">
                {attachment.originalName}
              </a>
              <span>{Math.ceil(attachment.size / 1024)} KB · {attachment.mimeType}</span>
              {canDelete && (
                <button className="text-button" disabled={busy} onClick={() => remove(attachment.id)}>
                  删除
                </button>
              )}
              <small>引用 ID：{attachment.id}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
