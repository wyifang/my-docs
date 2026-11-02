"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const roles = ["ADMIN", "AUTHOR", "REVIEWER", "PUBLISHER", "VIEWER"] as const;
type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  organizationId: string | null;
  createdAt: string;
};
type Organization = {
  id: string;
  name: string;
  active: boolean;
  userCount: number;
};

function errorMessage(error: string): string {
  const messages: Record<string, string> = {
    CANNOT_DISABLE_LAST_ACTIVE_ADMIN: "至少需要保留一个启用状态的管理员。",
    CANNOT_DISABLE_ORGANIZATION_WITH_ACTIVE_ADMIN: "请先将该组织中的启用管理员迁出或停用，再停用组织。",
    EMAIL_ALREADY_EXISTS: "该邮箱已存在。",
    ORGANIZATION_ID_ALREADY_EXISTS: "该组织 ID 已存在。",
    ORGANIZATION_NOT_FOUND_OR_INACTIVE: "所选组织不存在或已停用。",
    FORBIDDEN: "当前账号没有执行此操作的权限。",
    UNAUTHENTICATED: "登录状态已失效，请重新登录。",
  };
  return messages[error] ?? `操作失败：${error}`;
}

export function UserManagement({
  currentUserId,
  users,
  organizations,
}: {
  currentUserId: string;
  users: User[];
  organizations: Organization[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? String(response.status));
    router.refresh();
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(formElement);
    const organizationId = String(form.get("organizationId") ?? "");
    try {
      await send("/api/cms/admin/users", "POST", {
        email: form.get("email"),
        name: form.get("name"),
        password: form.get("password"),
        role: form.get("role"),
        organizationId: organizationId || null,
      });
      formElement.reset();
      setNotice("用户已创建。请通过安全渠道将初始密码交给用户。");
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : "UNKNOWN_ERROR"));
    } finally {
      setBusy(false);
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(formElement);
    try {
      await send("/api/cms/admin/organizations", "POST", {
        id: form.get("id"),
        name: form.get("name"),
      });
      formElement.reset();
      setNotice("组织已创建。");
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : "UNKNOWN_ERROR"));
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(event: FormEvent<HTMLFormElement>, user: User) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get("organizationId") ?? "");
    try {
      await send(`/api/cms/admin/users/${encodeURIComponent(user.id)}`, "PATCH", {
        name: form.get("name"),
        role: form.get("role"),
        organizationId: organizationId || null,
        active: form.get("active") === "on",
      });
      setNotice(`${user.email} 的账号设置已保存。`);
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : "UNKNOWN_ERROR"));
    } finally {
      setBusy(false);
    }
  }

  async function updateOrganization(event: FormEvent<HTMLFormElement>, organization: Organization) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      await send(`/api/cms/admin/organizations/${encodeURIComponent(organization.id)}`, "PATCH", {
        name: form.get("name"),
        active: form.get("active") === "on",
      });
      setNotice(`组织 ${organization.id} 的设置已保存。`);
    } catch (caught) {
      setError(errorMessage(caught instanceof Error ? caught.message : "UNKNOWN_ERROR"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-management">
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}

      <section className="panel admin-section">
        <h2>创建用户</h2>
        <p className="muted">初始密码至少 12 个字符。请使用唯一密码并通过安全渠道交付；密码不会写入审计记录。</p>
        <form className="form admin-create-form" onSubmit={submitUser}>
          <label>姓名<input name="name" required maxLength={100} /></label>
          <label>邮箱<input name="email" type="email" required maxLength={254} /></label>
          <label>初始密码<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" /></label>
          <label>角色
            <select name="role" defaultValue="VIEWER">
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label>所属组织
            <select name="organizationId" defaultValue="">
              <option value="">无组织</option>
              {organizations.filter((organization) => organization.active).map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name} ({organization.id})</option>
              ))}
            </select>
          </label>
          <button className="button" type="submit" disabled={busy}>{busy ? "处理中…" : "创建用户"}</button>
        </form>
      </section>

      <section className="panel admin-section">
        <h2>用户账号 <span className="count-badge">{users.length}</span></h2>
        {users.length === 0 ? <p className="muted">暂无用户。</p> : (
          <div className="admin-record-list">
            {users.map((user) => (
              <form
                className="admin-record"
                key={`${user.id}-${user.name}-${user.role}-${user.active}-${user.organizationId ?? ""}`}
                onSubmit={(event) => updateUser(event, user)}
              >
                <div className="admin-record-heading">
                  <strong>{user.email}{user.id === currentUserId ? "（当前账号）" : ""}</strong>
                  <span className={`status ${user.active ? "" : "status-draft"}`}>{user.active ? "启用" : "停用"}</span>
                </div>
                <div className="admin-fields">
                  <label>姓名<input name="name" defaultValue={user.name} required maxLength={100} /></label>
                  <label>角色
                    <select name="role" defaultValue={user.role}>
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                  <label>所属组织
                    <select name="organizationId" defaultValue={user.organizationId ?? ""}>
                      <option value="">无组织</option>
                      {organizations.map((organization) => (
                        <option key={organization.id} value={organization.id} disabled={!organization.active}>
                          {organization.name} ({organization.id}){organization.active ? "" : " · 已停用"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-active-toggle">
                    <input name="active" type="checkbox" defaultChecked={user.active} />
                    账号启用
                  </label>
                </div>
                <div className="admin-record-footer">
                  <span className="chunk-meta">创建于 {user.createdAt.slice(0, 10)}</span>
                  <button className="button secondary" type="submit" disabled={busy}>保存用户设置</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="panel admin-section">
        <h2>组织</h2>
        <form className="form admin-create-form organization-create-form" onSubmit={submitOrganization}>
          <label>组织 ID<input name="id" required maxLength={100} pattern="[A-Za-z0-9._-]+" /></label>
          <label>组织名称<input name="name" required maxLength={200} /></label>
          <button className="button" type="submit" disabled={busy}>{busy ? "处理中…" : "创建组织"}</button>
        </form>
        {organizations.length === 0 ? <p className="muted">暂无组织。</p> : (
          <div className="admin-record-list">
            {organizations.map((organization) => (
              <form
                className="admin-record"
                key={`${organization.id}-${organization.name}-${organization.active}`}
                onSubmit={(event) => updateOrganization(event, organization)}
              >
                <div className="admin-record-heading">
                  <strong>{organization.id}</strong>
                  <span className={`status ${organization.active ? "" : "status-draft"}`}>
                    {organization.active ? "启用" : "停用"} · {organization.userCount} 个用户
                  </span>
                </div>
                <div className="admin-fields organization-fields">
                  <label>名称<input name="name" defaultValue={organization.name} required maxLength={200} /></label>
                  <label className="admin-active-toggle">
                    <input name="active" type="checkbox" defaultChecked={organization.active} />
                    组织启用
                  </label>
                </div>
                <div className="admin-record-footer">
                  <button className="button secondary" type="submit" disabled={busy}>保存组织设置</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
