"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Translation = { id: string; slug: string; title: string; language: string; status: string };

export function PageTranslationLink({
  pageId,
  translations,
}: {
  pageId: string;
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
      const response = await fetch(`/api/cms/pages/${pageId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otherContentId: form.get("otherPageId") }),
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
      <h3>页面语言版本</h3>
      {translations.length ? (
        <ul className="translation-list">
          {translations.map((translation) => (
            <li key={translation.id}>
              <Link href={`/cms/pages/${translation.id}`}>{translation.title}</Link>
              <span className="chunk-meta"> · {translation.language} · {translation.status}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">尚未关联其他语言页面。每个语言页面独立审核和发布。</p>}
      <form className="translation-form" onSubmit={submit}>
        <label>关联另一个页面的 ID
          <input name="otherPageId" required maxLength={100} placeholder="先创建另一语言页面，再粘贴页面 ID" />
        </label>
        <button className="button secondary" type="submit" disabled={busy}>
          {busy ? "正在关联…" : "关联语言页面"}
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
