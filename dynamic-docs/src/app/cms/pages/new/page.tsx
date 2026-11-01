import Link from "next/link";
import { redirect } from "next/navigation";
import { PageForm } from "@/components/page-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "AUTHOR"].includes(user.role)) redirect("/cms/pages");
  return (
    <main className="shell narrow">
      <header className="topbar">
        <Link className="brand" href="/cms/pages">页面管理</Link>
        <Link href="/cms">返回内容管理</Link>
      </header>
      <section className="panel page-editor-panel">
        <p className="eyebrow">NEW DOCUMENT PAGE</p>
        <h1>创建页面草稿</h1>
        <p className="muted">页面仅组织 Chunk，不复制正文。所有引用内容须具有相同语言、产品和 API 版本。</p>
        <PageForm />
      </section>
    </main>
  );
}
