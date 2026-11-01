import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessPublishedRevision, serializeRevision } from "@/lib/content";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ chunkId: string }>;
  searchParams: Promise<{ product?: string | string[]; apiVersion?: string | string[]; language?: string | string[] }>;
};

export default async function PublicChunkPage({ params, searchParams }: RouteProps) {
  const [{ chunkId }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const publication = await db.publishedChunk.findUnique({
    where: { chunkId },
    include: {
      revision: true,
      chunk: {
        include: {
          languageGroup: {
            include: {
              chunks: {
                include: { published: { include: { revision: true } } },
              },
            },
          },
          attachments: {
            select: { id: true, originalName: true, mimeType: true, size: true },
          },
        },
      },
    },
  });
  if (!publication) notFound();
  const product = Array.isArray(query.product) ? query.product[0] : query.product;
  const apiVersion = Array.isArray(query.apiVersion) ? query.apiVersion[0] : query.apiVersion;
  const language = Array.isArray(query.language) ? query.language[0] : query.language;
  if (!canAccessPublishedRevision(publication.revision, user, { product, apiVersion, language })) notFound();

  const chunk = serializeRevision(publication.revision);
  const languageVariants = publication.chunk.languageGroup?.chunks
    .filter((variant) => variant.id !== chunkId && variant.published)
    .flatMap((variant) => {
      const revision = variant.published?.revision;
      if (
        !revision ||
        revision.product !== chunk.product ||
        revision.apiVersion !== chunk.apiVersion ||
        !canAccessPublishedRevision(revision, user, {
          product: revision.product,
          apiVersion: revision.apiVersion,
          language: revision.language,
        })
      ) return [];
      return [{ id: variant.id, title: revision.title, language: revision.language }];
    }) ?? [];
  const bodyJson = JSON.parse(publication.revision.bodyJson) as unknown;
  const referencedIds = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string" && publication.chunk.attachments.some((file) => file.id === value)) {
      referencedIds.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(visit);
    }
  };
  visit(bodyJson);
  const publicAttachments = publication.chunk.attachments.filter((file) => referencedIds.has(file.id));
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">DocForge</Link>
        <nav aria-label="主导航"><Link href="/">文档目录</Link></nav>
      </header>
      <article className="document">
        <p className="eyebrow">
          {chunk.product} · API {chunk.apiVersion} · {chunk.language}
        </p>
        <h1>{chunk.title}</h1>
        <div className="metadata">
          <span>内容修订 {chunk.revision}</span>
          <span>状态：{chunk.deprecationStatus}</span>
          <span>最近验证：{chunk.lastVerified ?? "尚未记录"}</span>
          <span>发布于：{publication.publishedAt.toISOString()}</span>
        </div>
        {languageVariants.length > 0 && (
          <nav className="language-switch" aria-label="内容语言">
            <span>其他语言版本：</span>
            {languageVariants.map((variant) => (
              <Link
                key={variant.id}
                href={`/docs/${variant.id}?product=${encodeURIComponent(chunk.product)}&apiVersion=${encodeURIComponent(chunk.apiVersion)}&language=${encodeURIComponent(variant.language)}`}
              >
                {variant.language} · {variant.title}
              </Link>
            ))}
          </nav>
        )}
        <section className="content-card" aria-label="结构化 API 内容">
          <h2>结构化内容</h2>
          <pre className="json-view"><code>{JSON.stringify(chunk.body, null, 2)}</code></pre>
        </section>
        {publicAttachments.length > 0 && (
          <section className="content-card attachment-card" aria-labelledby="public-attachments">
            <h2 id="public-attachments">相关附件</h2>
            <ul>
              {publicAttachments.map((file) => (
                <li key={file.id}>
                          <a href={`/api/attachments/${file.id}?product=${encodeURIComponent(chunk.product)}&apiVersion=${encodeURIComponent(chunk.apiVersion)}&language=${encodeURIComponent(chunk.language)}`}>{file.originalName}</a>
                  <span className="chunk-meta"> · {file.mimeType}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
