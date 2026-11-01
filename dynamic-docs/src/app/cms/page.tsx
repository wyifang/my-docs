import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCmsChunks } from "@/lib/content";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const chunks = await listCmsChunks(user);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">DocForge CMS</Link>
        <div className="userbar">
          <span>{user.name} · {user.role}</span>
          <LogoutButton />
        </div>
      </header>
      <section className="section-heading">
        <div><p className="eyebrow">CONTENT WORKSPACE</p><h1>内容管理</h1></div>
        <nav className="workspace-actions" aria-label="内容管理操作">
          <Link className="button secondary" href="/cms/pages">页面管理</Link>
          {["ADMIN", "AUTHOR"].includes(user.role) && <Link className="button" href="/cms/new">新建 API Chunk</Link>}
        </nav>
      </section>
      {chunks.length === 0 ? (
        <div className="empty-state"><h2>当前没有可管理的内容</h2><p>根据账号角色，仅显示你有权查看的草稿、审核任务或已发布内容。</p></div>
      ) : (
        <ul className="chunk-list cms-list">
          {chunks.map((chunk) => chunk.latest && (
            <li key={chunk.id}>
              <Link href={`/cms/chunks/${chunk.id}`}>
                <span className="chunk-title">{chunk.latest.title}</span>
                <span className="chunk-meta">
                  修订 {chunk.latest.revision} · {chunk.latest.language} · {chunk.latest.product} API {chunk.latest.apiVersion}
                </span>
              </Link>
              <span className={`status status-${chunk.latest.reviewStatus.toLowerCase()}`}>
                {chunk.latest.reviewStatus}{chunk.publishedRevision ? ` · 已发布 r${chunk.publishedRevision}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
