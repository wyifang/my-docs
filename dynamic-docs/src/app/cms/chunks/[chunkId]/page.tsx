import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChunkForm } from "@/components/chunk-form";
import { RestoreRevisionButton } from "@/components/restore-revision-button";
import { WorkflowActions } from "@/components/workflow-actions";
import { AttachmentManager } from "@/components/attachment-manager";
import { DeleteChunkButton } from "@/components/delete-chunk-button";
import { TranslationLink } from "@/components/translation-link";
import { getCurrentUser } from "@/lib/auth";
import { getCmsChunk } from "@/lib/content";
import { db } from "@/lib/db";
import { canRestoreRevision, compareRevisionValues } from "@/lib/revision-diff";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ chunkId: string }>;
  searchParams: Promise<{ compare?: string | string[] }>;
};

const revisionFieldLabels: Record<string, string> = {
  title: "标题",
  contentType: "内容类型",
  language: "语言",
  product: "产品",
  apiVersion: "API 版本",
  accessPolicy: "访问策略",
  allowedOrganizationIds: "允许的组织",
  tags: "标签",
  allowedAgentScope: "Agent 用途范围",
  lastVerified: "最近验证时间",
  deprecationStatus: "弃用状态",
  body: "结构化正文",
};

function formatDiffValue(value: unknown): string {
  if (value === undefined) return "（无此字段）";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function renderBodyValue(value: unknown): React.ReactNode {
  if (value === null || typeof value !== "object") {
    return <span className="body-value">{String(value ?? "—")}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="body-value-list">
        {value.map((item, index) => <li key={index}>{renderBodyValue(item)}</li>)}
      </ul>
    );
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return <span className="muted">无内容</span>;
  return (
    <dl className="body-fields body-fields-nested">
      {entries.map(([key, item]) => (
        <div className="body-field" key={key}>
          <dt>{key}</dt>
          <dd>{renderBodyValue(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function CmsChunkPage({ params, searchParams }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ chunkId }, query] = await Promise.all([params, searchParams]);
  const chunk = await getCmsChunk(chunkId, user);
  if (!chunk) notFound();
  const attachments =
    ["ADMIN", "AUTHOR", "REVIEWER"].includes(user.role)
      ? await db.attachment.findMany({
          where: { chunkId },
          orderBy: { createdAt: "desc" },
          select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
        })
      : [];

  const latest = chunk.revisions[0];
  const isAuthor = user.role === "ADMIN" || (user.role === "AUTHOR" && latest.reviewStatus !== "IN_REVIEW");
  const published = chunk.publishedRevision === latest.revision;
  const compareId = Array.isArray(query.compare) ? query.compare[0] : query.compare;
  const compareRevision =
    chunk.revisions.find((revision) => revision.id === compareId && revision.id !== latest.id) ??
    chunk.revisions.find((revision) => revision.id !== latest.id);
  const canRestore = canRestoreRevision({
    role: user.role,
    ownsChunk: user.role === "AUTHOR",
    latestStatus: latest.reviewStatus,
    latestIsPublished: published,
  });
  const changes = compareRevision
    ? compareRevisionValues(
        {
          title: compareRevision.title,
          contentType: compareRevision.contentType,
          language: compareRevision.language,
          product: compareRevision.product,
          apiVersion: compareRevision.apiVersion,
          accessPolicy: compareRevision.accessPolicy,
          allowedOrganizationIds: compareRevision.allowedOrganizationIds,
          tags: compareRevision.tags,
          allowedAgentScope: compareRevision.allowedAgentScope,
          lastVerified: compareRevision.lastVerified,
          deprecationStatus: compareRevision.deprecationStatus,
          body: compareRevision.body,
        },
        {
          title: latest.title,
          contentType: latest.contentType,
          language: latest.language,
          product: latest.product,
          apiVersion: latest.apiVersion,
          accessPolicy: latest.accessPolicy,
          allowedOrganizationIds: latest.allowedOrganizationIds,
          tags: latest.tags,
          allowedAgentScope: latest.allowedAgentScope,
          lastVerified: latest.lastVerified,
          deprecationStatus: latest.deprecationStatus,
          body: latest.body,
        },
      )
    : [];
  const referencedAttachmentIds = new Set<string>();
  const findAttachmentReferences = (value: unknown) => {
    if (typeof value === "string" && attachments.some((attachment) => attachment.id === value)) {
      referencedAttachmentIds.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(findAttachmentReferences);
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(findAttachmentReferences);
    }
  };
  findAttachmentReferences(latest.body);
  const reviewAttachments = attachments.filter((attachment) => referencedAttachmentIds.has(attachment.id));

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/cms">DocForge CMS</Link>
        <Link href="/cms">返回内容列表</Link>
      </header>
      <section className="detail-grid">
        <div className="panel">
          <p className="eyebrow">CHUNK {chunk.id}</p>
          <h1>{latest.title}</h1>
          <div className="metadata">
            <span>修订 {latest.revision}</span><span>{latest.reviewStatus}</span>
            <span>{latest.language} · {latest.product} API {latest.apiVersion}</span>
          </div>
          <section className="review-context" aria-label="审核上下文">
            <h2>适用范围与状态</h2>
            <dl className="review-context-list">
              <div><dt>内容类型</dt><dd>{latest.contentType}</dd></div>
              <div><dt>访问策略</dt><dd>{latest.accessPolicy}</dd></div>
              {latest.allowedOrganizationIds.length > 0 && (
                <div><dt>允许的组织</dt><dd>{latest.allowedOrganizationIds.join("、")}</dd></div>
              )}
              <div><dt>弃用状态</dt><dd>{latest.deprecationStatus}</dd></div>
              <div><dt>最近验证</dt><dd>{latest.lastVerified ?? "尚未记录"}</dd></div>
              <div><dt>标签</dt><dd>{latest.tags.length > 0 ? latest.tags.join("、") : "无"}</dd></div>
              <div><dt>Agent 用途范围</dt><dd>{latest.allowedAgentScope.length > 0 ? latest.allowedAgentScope.join(", ") : "未指定"}</dd></div>
            </dl>
          </section>
          {latest.reviewer && (
            <p className="reviewer-assignment">
              指派审核员：{latest.reviewer.name}（{latest.reviewer.email}）
            </p>
          )}
          {latest.reviewComment && <p className="review-comment"><strong>审核反馈：</strong>{latest.reviewComment}</p>}
          <section className="content-card review-preview" aria-labelledby="review-preview-title">
            <h2 id="review-preview-title">待审核内容</h2>
            {latest.contentType === "api_operation" &&
              typeof latest.body.method === "string" &&
              typeof latest.body.path === "string" && (
                <p className="api-endpoint">
                  <span>{latest.body.method}</span> <code>{latest.body.path}</code>
                </p>
              )}
            {typeof latest.body.summary === "string" && (
              <p className="review-summary">{latest.body.summary}</p>
            )}
            <dl className="body-fields">
              {Object.entries(latest.body).map(([key, value]) => (
                <div className="body-field" key={key}>
                  <dt>{key}</dt>
                  <dd>{renderBodyValue(value)}</dd>
                </div>
              ))}
            </dl>
            {reviewAttachments.length > 0 && (
              <div className="review-attachments">
                <h3>正文引用的附件</h3>
                <ul>
                  {reviewAttachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a href={`/api/attachments/${attachment.id}?product=${encodeURIComponent(latest.product)}&apiVersion=${encodeURIComponent(latest.apiVersion)}&language=${encodeURIComponent(latest.language)}`}>
                        {attachment.originalName}
                      </a>
                      <span className="chunk-meta"> · {attachment.mimeType} · {attachment.size} bytes</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <WorkflowActions
            revisionId={latest.id}
            status={latest.reviewStatus}
            role={user.role}
            published={published}
          />
          {isAuthor && (
            <details className="editor-details">
              <summary>创建新内容修订</summary>
              <p className="muted">
                保存会创建下一个修订号（例如 r2），不会覆盖历史版本或当前已发布内容。新修订状态为 DRAFT，需重新提交审核并批准后才能发布。
              </p>
              <ChunkForm chunkId={chunkId} initial={latest} />
            </details>
          )}
          {["ADMIN", "AUTHOR"].includes(user.role) && (
            <TranslationLink chunkId={chunkId} translations={chunk.translations} />
          )}
          {["ADMIN", "AUTHOR"].includes(user.role) && (
            <AttachmentManager
              chunkId={chunkId}
              initialAttachments={attachments.map((attachment) => ({
                ...attachment,
                createdAt: attachment.createdAt.toISOString(),
              }))}
              canDelete={chunk.publishedRevision === null}
            />
          )}
          {["ADMIN", "AUTHOR"].includes(user.role) && chunk.publishedRevision === null && (
            <DeleteChunkButton chunkId={chunkId} />
          )}
        </div>
        <aside className="panel">
          <h2>版本历史</h2>
          <ol className="revision-list">
            {chunk.revisions.map((revision) => (
              <li key={revision.id}>
                <strong>
                  r{revision.revision} · {revision.reviewStatus}
                  {revision.id !== latest.id && (
                    revision.id === compareRevision?.id ? (
                      <> · <span className="current-comparison">当前对比</span></>
                    ) : (
                      <> · <Link href={`/cms/chunks/${chunkId}?compare=${encodeURIComponent(revision.id)}`}>与最新对比</Link></>
                    )
                  )}
                </strong>
                <span>{revision.createdAt}</span>
                {chunk.publishedRevision === revision.revision && <span className="status">当前公开版本</span>}
                {revision.restoredFromRevision && (
                  <span>恢复自 r{revision.restoredFromRevision.revision}</span>
                )}
                {revision.reviewComment && <span className="review-history-comment">审核反馈：{revision.reviewComment}</span>}
              </li>
            ))}
          </ol>
          {compareRevision && (
            <section className="revision-comparison" aria-labelledby="revision-comparison-title">
              <h3 id="revision-comparison-title">
                修订对比：r{compareRevision.revision} → r{latest.revision}
              </h3>
              {changes.length === 0 ? (
                <p className="muted">两个修订的元数据和正文没有差异。</p>
              ) : (
                <ul className="change-list">
                  {changes.map((change) => (
                    <li key={change.path}>
                      <strong>{revisionFieldLabels[change.path] ?? change.path}</strong>
                      <div className="change-values">
                        <pre className="change-before">{formatDiffValue(change.before)}</pre>
                        <pre className="change-after">{formatDiffValue(change.after)}</pre>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canRestore && (
                <RestoreRevisionButton
                  chunkId={chunkId}
                  sourceRevisionId={compareRevision.id}
                  sourceRevision={compareRevision.revision}
                />
              )}
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
