import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCmsPages } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function CmsPagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const pages = await listCmsPages(user);
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/cms">DocForge CMS</Link>
        <div className="userbar"><span>{user.name} · {user.role}</span><Link href="/cms">内容管理</Link></div>
      </header>
      <section className="section-heading">
        <div><p className="eyebrow">PAGE WORKSPACE</p><h1>页面管理</h1></div>
        {["ADMIN", "AUTHOR"].includes(user.role) && <Link className="button" href="/cms/pages/new">新建页面</Link>}
      </section>
      {pages.length === 0 ? (
        <div className="empty-state"><h2>当前没有可管理的页面</h2><p>页面由多个有序的 Chunk 引用组成。</p></div>
      ) : (
        <ul className="chunk-list cms-list">
          {pages.map((page) => page.revisions[0] && (
            <li key={page.id}>
              <Link href={`/cms/pages/${page.id}`}>
                <span className="chunk-title">{page.revisions[0].title}</span>
                <span className="chunk-meta">/{page.slug} · {page.revisions[0].language} · {page.revisions[0].product} API {page.revisions[0].apiVersion}</span>
              </Link>
              <span className="status">{page.revisions[0].reviewStatus}{page.publishedRevision ? ` · 已发布 r${page.publishedRevision}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
