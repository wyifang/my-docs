import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedPage } from "@/lib/pages";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ product?: string | string[]; apiVersion?: string | string[]; language?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublishedPage({ params, searchParams }: RouteProps) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const page = await getPublishedPage(slug, user, {
    product: first(query.product),
    apiVersion: first(query.apiVersion),
    language: first(query.language),
  });
  if (!page) notFound();

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">DocForge</Link>
        <nav aria-label="主导航"><Link href="/">文档目录</Link></nav>
      </header>
      <article className="document">
        <p className="eyebrow">{page.product} · API {page.apiVersion} · {page.language}</p>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
        <div className="metadata"><span>页面修订 {page.revision}</span><span>发布于：{page.publishedAt}</span></div>
        {page.translations.length > 0 && (
          <nav className="language-switch" aria-label="页面语言">
            <span>其他语言版本：</span>
            {page.translations.map((translation) => (
              <Link
                key={translation.slug}
                href={`/docs/pages/${encodeURIComponent(translation.slug)}?product=${encodeURIComponent(translation.product)}&apiVersion=${encodeURIComponent(translation.apiVersion)}&language=${encodeURIComponent(translation.language)}`}
              >
                {translation.language} · {translation.title}
              </Link>
            ))}
          </nav>
        )}
        <ol className="published-page-chunks">
          {page.chunks.map(({ position, chunk }) => (
            <li key={chunk.chunkId} value={position + 1}>
              <section className="content-card">
                <p className="eyebrow">{chunk.contentType} · 修订 {chunk.revision} · {chunk.deprecationStatus}</p>
                <h2>{chunk.title}</h2>
                {typeof chunk.body.summary === "string" && <p>{chunk.body.summary}</p>}
                <pre className="json-view"><code>{JSON.stringify(chunk.body, null, 2)}</code></pre>
                <Link href={`/docs/${chunk.chunkId}?product=${encodeURIComponent(page.product)}&apiVersion=${encodeURIComponent(page.apiVersion)}&language=${encodeURIComponent(page.language)}`}>
                  查看独立内容
                </Link>
              </section>
            </li>
          ))}
        </ol>
      </article>
    </main>
  );
}
