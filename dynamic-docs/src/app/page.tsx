import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { searchPublishedChunks } from "@/lib/content";
import { listPublicPages } from "@/lib/pages";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string | string[];
  language?: string | string[];
  product?: string | string[];
  apiVersion?: string | string[];
  page?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim().slice(0, 100);
  const languageValue = first(params.language);
  const language = languageValue && ["zh-CN", "en-US"].includes(languageValue) ? languageValue : undefined;
  const product = (first(params.product) ?? "").trim().slice(0, 100) || undefined;
  const apiVersion = (first(params.apiVersion) ?? "").trim().slice(0, 50) || undefined;
  const requestedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000) : 1;
  const user = await getCurrentUser();
  const [results, pages] = await Promise.all([
    searchPublishedChunks({ q, language, product, apiVersion, page, user }),
    listPublicPages(),
  ]);
  const filtered = Boolean(q || language || product || apiVersion);
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">DocForge</Link>
        <nav aria-label="主导航">
          {user ? <Link href="/cms">CMS · {user.role}</Link> : <Link href="/login">员工登录</Link>}
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">DYNAMIC TECHNICAL DOCS · MVP</p>
        <h1>让文档内容可管理、可追踪、可检索</h1>
        <p>公开页面只读取已发布版本。草稿和审核内容保留在受控的 CMS 中。</p>
      </section>
      <section aria-labelledby="docs-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">API REFERENCE</p>
            <h2 id="docs-title">已发布内容</h2>
          </div>
          <span>{results.total} 个匹配内容块</span>
        </div>
        <form className="search-form" action="/" method="get" role="search">
          <label>
            全文搜索
            <input name="q" type="search" defaultValue={q} placeholder="搜索标题、正文或标签" maxLength={100} />
          </label>
          <label>
            语言
            <select name="language" defaultValue={language ?? ""}>
              <option value="">全部语言</option>
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <label>产品<input name="product" defaultValue={product ?? ""} maxLength={100} /></label>
          <label>API 版本<input name="apiVersion" defaultValue={apiVersion ?? ""} maxLength={50} /></label>
          <button className="button" type="submit">搜索</button>
        </form>
        {results.chunks.length === 0 ? (
          <div className="empty-state">
            <h3>{filtered ? "没有找到可访问的匹配内容" : "还没有可访问的已发布文档"}</h3>
            <p>草稿和审核中内容不会进入站点搜索结果。组织受限内容需要匹配账号授权以及产品/API 版本。</p>
            {!user && <Link className="button secondary" href="/login">员工登录</Link>}
          </div>
        ) : (
          <ul className="chunk-list">
            {results.chunks.map((chunk) => (
              <li key={chunk.id}>
                <Link href={`/docs/${chunk.chunkId}?product=${encodeURIComponent(chunk.product)}&apiVersion=${encodeURIComponent(chunk.apiVersion)}&language=${encodeURIComponent(chunk.language)}`}>
                  <span className="chunk-title">{chunk.title}</span>
                  <span className="chunk-meta">{chunk.language} · {chunk.product} · API {chunk.apiVersion} · 内容修订 {chunk.revision}</span>
                  <span className="chunk-meta">标签：{chunk.tags.join("、") || "无"} · {chunk.contentType}</span>
                </Link>
                <span className={`status status-${chunk.deprecationStatus}`}>{chunk.deprecationStatus}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {pages.length > 0 && (
        <section className="published-pages" aria-labelledby="pages-title">
          <div className="section-heading">
            <div><p className="eyebrow">GUIDES</p><h2 id="pages-title">已发布页面</h2></div>
          </div>
          <ul className="chunk-list">
            {pages.map((docPage) => (
              <li key={docPage.slug}>
                <Link href={`/docs/pages/${encodeURIComponent(docPage.slug)}?product=${encodeURIComponent(docPage.product)}&apiVersion=${encodeURIComponent(docPage.apiVersion)}&language=${encodeURIComponent(docPage.language)}`}>
                  <span className="chunk-title">{docPage.title}</span>
                  {docPage.summary && <span className="chunk-meta">{docPage.summary}</span>}
                  <span className="chunk-meta">{docPage.language} · {docPage.product} · API {docPage.apiVersion}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer className="footer">动态文档站 MVP · 内容和搜索结果由已发布数据库版本提供</footer>
    </main>
  );
}
