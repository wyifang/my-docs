import Link from "next/link";
import { redirect } from "next/navigation";
import { ChunkForm } from "@/components/chunk-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewChunkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "AUTHOR"].includes(user.role)) redirect("/cms");
  return (
    <main className="shell narrow">
      <header className="topbar"><Link className="brand" href="/cms">DocForge CMS</Link></header>
      <section className="panel">
        <p className="eyebrow">NEW API CHUNK</p>
        <h1>创建草稿</h1>
        <p className="muted">保存会创建一个新的内容修订；草稿不会公开显示。</p>
        <ChunkForm />
      </section>
    </main>
  );
}
