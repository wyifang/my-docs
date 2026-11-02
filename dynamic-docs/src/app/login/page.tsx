import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="shell narrow">
      <header className="topbar">
        <Link className="brand" href="/">DocForge</Link>
      </header>
      <section className="panel">
        <p className="eyebrow">CMS ACCESS</p>
        <h1>账号登录</h1>
        <p className="muted">账号由管理员创建和管理；当前 MVP 不开放自助注册。</p>
        <LoginForm />
      </section>
    </main>
  );
}
