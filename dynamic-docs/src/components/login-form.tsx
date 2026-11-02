"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const minutes = Number.isFinite(retryAfter) ? Math.max(1, Math.ceil(retryAfter / 60)) : 15;
          setError(`尝试次数过多，请约 ${minutes} 分钟后重试。`);
        } else {
          setError(response.status === 401 ? "邮箱或密码不正确。" : "登录失败，请检查输入后重试。");
        }
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
    <form className="form" onSubmit={submit}>
      <label>
        邮箱
        <input name="email" type="email" autoComplete="username" required maxLength={254} />
      </label>
      <label>
        密码
        <input name="password" type="password" autoComplete="current-password" required maxLength={256} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
