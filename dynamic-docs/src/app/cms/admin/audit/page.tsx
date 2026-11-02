import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatAuditDetails } from "@/lib/audit-details";

export const dynamic = "force-dynamic";

const pageSize = 25;

type SearchParams = {
  action?: string | string[];
  targetType?: string | string[];
  targetId?: string | string[];
  page?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function makePageHref(page: number, filters: { action: string; targetType: string; targetId: string }) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.action) params.set("action", filters.action);
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.targetId) params.set("targetId", filters.targetId);
  return `/cms/admin/audit?${params}`;
}

function localDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Shanghai",
  }).format(value);
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/cms");

  const params = await searchParams;
  const actionValue = first(params.action) ?? "";
  const targetTypeValue = first(params.targetType) ?? "";
  const targetId = (first(params.targetId) ?? "").trim().slice(0, 120);
  const pageValue = first(params.page) ?? "1";
  const parsedPage = /^\d{1,4}$/.test(pageValue) ? Number.parseInt(pageValue, 10) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [actions, targetTypes] = await Promise.all([
    db.auditEvent.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditEvent.findMany({ distinct: ["targetType"], select: { targetType: true }, orderBy: { targetType: "asc" } }),
  ]);
  const action = actions.some((entry) => entry.action === actionValue) ? actionValue : "";
  const targetType = targetTypes.some((entry) => entry.targetType === targetTypeValue) ? targetTypeValue : "";
  const where = {
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId: { contains: targetId } } : {}),
  };
  const [total, events] = await Promise.all([
    db.auditEvent.count({ where }),
    db.auditEvent.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleEvents = safePage === page
    ? events
    : await db.auditEvent.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (safePage - 1) * pageSize,
        take: pageSize,
      });
  const filters = { action, targetType, targetId };

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/cms">DocForge CMS</Link>
        <Link href="/cms/admin">返回管理</Link>
      </header>
      <section className="section-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION · AUDIT</p>
          <h1>审计日志</h1>
        </div>
        <span>{total} 条记录</span>
      </section>
      <p className="muted">仅管理员可查看。时间按北京时间显示；敏感字段会脱敏。</p>
      <form className="form audit-filters" action="/cms/admin/audit" method="get">
        <label>操作
          <select name="action" defaultValue={action}>
            <option value="">全部操作</option>
            {actions.map(({ action: item }) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>目标类型
          <select name="targetType" defaultValue={targetType}>
            <option value="">全部类型</option>
            {targetTypes.map(({ targetType: item }) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>目标 ID
          <input name="targetId" defaultValue={targetId} maxLength={120} />
        </label>
        <button className="button" type="submit">筛选</button>
      </form>

      {visibleEvents.length === 0 ? (
        <div className="empty-state"><h2>没有匹配的审计记录</h2><p>可以清除筛选条件后重试。</p></div>
      ) : (
        <ol className="audit-list">
          {visibleEvents.map((event) => (
            <li className="audit-record" key={event.id}>
              <div className="audit-record-heading">
                <strong>{event.action}</strong>
                <time dateTime={event.createdAt.toISOString()}>{localDateTime(event.createdAt)}</time>
              </div>
              <dl className="audit-record-meta">
                <div><dt>操作者</dt><dd>{event.actor ? `${event.actor.name} · ${event.actor.email}` : "账号已删除"}</dd></div>
                <div><dt>目标</dt><dd>{event.targetType} · <code>{event.targetId}</code></dd></div>
              </dl>
              <details>
                <summary>查看审计详情</summary>
                <pre>{formatAuditDetails(event.detailsJson)}</pre>
              </details>
            </li>
          ))}
        </ol>
      )}

      <nav className="audit-pagination" aria-label="审计日志分页">
        <span>第 {safePage} / {pageCount} 页</span>
        {safePage > 1
          ? <Link className="button secondary" href={makePageHref(safePage - 1, filters)}>上一页</Link>
          : <span className="button secondary is-disabled">上一页</span>}
        {safePage < pageCount
          ? <Link className="button secondary" href={makePageHref(safePage + 1, filters)}>下一页</Link>
          : <span className="button secondary is-disabled">下一页</span>}
      </nav>
    </main>
  );
}
