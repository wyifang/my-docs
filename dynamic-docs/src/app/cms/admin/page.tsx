import Link from "next/link";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/user-management";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "ADMIN") redirect("/cms");

  const [users, organizations] = await Promise.all([
    db.user.findMany({
      orderBy: [{ createdAt: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        organizationId: true,
        createdAt: true,
      },
    }),
    db.organization.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/cms">DocForge CMS</Link>
        <Link href="/cms">返回内容管理</Link>
      </header>
      <section className="section-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>用户与组织管理</h1>
        </div>
        <Link className="button secondary" href="/cms/admin/audit">
          查看审计日志
        </Link>
      </section>
      <p className="muted">
        只有管理员可访问此页面。停用用户或组织会撤销关联会话和 Agent Token；用户停用后需重新启用并重新签发 Token 才能恢复访问。
      </p>
      <UserManagement
        currentUserId={currentUser.id}
        users={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        }))}
        organizations={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          active: organization.active,
          userCount: organization._count.users,
        }))}
      />
    </main>
  );
}
