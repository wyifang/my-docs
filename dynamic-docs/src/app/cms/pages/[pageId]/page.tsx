import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageForm } from "@/components/page-form";
import { PageWorkflowActions } from "@/components/page-workflow-actions";
import { DeletePageButton } from "@/components/delete-page-button";
import { PageTranslationLink } from "@/components/page-translation-link";
import { getCurrentUser } from "@/lib/auth";
import { getCmsPage } from "@/lib/pages";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ pageId: string }> };

export default async function CmsPageDetail({ params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { pageId } = await params;
  const page = await getCmsPage(pageId, user);
  if (!page) notFound();
  const latest = page.revisions[0];
  const published = page.publishedRevision === latest.revision;
  const canEdit = user.role === "ADMIN" || (user.role === "AUTHOR" && latest.reviewStatus !== "IN_REVIEW");

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/cms/pages">DocForge · 页面管理</Link>
        <Link href="/cms/pages">返回页面列表</Link>
      </header>
      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">PAGE /{page.slug}</p>
          <h1>{latest.title}</h1>
          <div className="metadata">
            <span>修订 {latest.revision}</span><span>{latest.reviewStatus}</span>
            <span>{latest.language} · {latest.product} API {latest.apiVersion}</span>
          </div>
          {latest.summary && <p>{latest.summary}</p>}
          {latest.reviewer && <p className="reviewer-assignment">指派审核员：{latest.reviewer.name}（{latest.reviewer.email}）</p>}
          {latest.reviewComment && <p className="review-comment"><strong>审核反馈：</strong>{latest.reviewComment}</p>}
          <h2>按顺序引用的 Chunk</h2>
          <ol className="page-chunk-list">
            {latest.items.map((item) => (
              <li key={item.chunkId}>
                <Link href={`/cms/chunks/${item.chunkId}`}>
                  {item.publishedRevision?.title ?? item.chunkId}
                </Link>
                {item.publishedRevision
                  ? <span className="chunk-meta"> · 当前发布修订 r{item.publishedRevision.revision}</span>
                  : <span className="status status-draft">尚未发布</span>}
              </li>
            ))}
          </ol>
          <PageWorkflowActions
            pageId={page.id}
            status={latest.reviewStatus}
            role={user.role}
            published={published}
          />
          {["ADMIN", "AUTHOR"].includes(user.role) && (
            <PageTranslationLink pageId={page.id} translations={page.translations} />
          )}
          {canEdit && (
            <details className="editor-details">
              <summary>创建新页面修订</summary>
              <p className="muted">保存为下一修订，不覆盖当前页面发布版本；引用 Chunk 时按输入顺序排列。</p>
              <PageForm pageId={page.id} initial={{
                title: latest.title,
                summary: latest.summary,
                language: latest.language,
                product: latest.product,
                apiVersion: latest.apiVersion,
                chunkIds: latest.items.map((item) => item.chunkId),
              }} />
            </details>
          )}
          {canEdit && page.publishedRevision === null && <DeletePageButton pageId={page.id} />}
        </article>
        <aside className="panel">
          <h2>页面修订历史</h2>
          <ol className="revision-list">
            {page.revisions.map((revision) => (
              <li key={revision.id}>
                <strong>r{revision.revision} · {revision.reviewStatus}</strong>
                <span>{revision.createdAt}</span>
                {page.publishedRevision === revision.revision && <span className="status">当前发布版本</span>}
                {revision.reviewComment && <span className="review-history-comment">审核反馈：{revision.reviewComment}</span>}
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
