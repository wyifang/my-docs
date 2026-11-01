"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Translation = { id: string; title: string; language: string; revision: number; status: string };

export function TranslationLink({
  chunkId,
  translations,
}: {
  chunkId: string;
  translations: Translation[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/cms/chunks/${chunkId}/translations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otherContentId: form.get("otherChunkId") }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(`关联失败：${result.error ?? response.status}`);
        return;
      }
      router.refresh();
      event.currentTarget.reset();
    } catch {
      setError("无法连接服务，请确认应用正在运行。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="translation-panel">
      <h3>语言版本关联</h3>
      {translations.length ? (
        <ul className="translation-list">
          {translations.map((translation) => (
            <li key={translation.id}>
              <a href={`/cms/chunks/${translation.id}`}>{translation.title}</a>
              <span className="chunk-meta"> · {translation.language} · r{translation.revision} · {translation.status}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">尚未关联其他语言版本。不同语言有独立修订、审核和发布状态。</p>}
      <form className="translation-form" onSubmit={submit}>
        <label>关联另一个语言 Chunk 的 ID
          <input name="otherChunkId" required maxLength={100} placeholder="先创建另一种语言的 Chunk，再粘贴其 ID" />
        </label>
        <button className="button secondary" type="submit" disabled={busy}>
          {busy ? "正在关联…" : "关联语言版本"}
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
