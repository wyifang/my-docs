import type { CurrentUser, Role } from "@/lib/auth";
import { hashSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export type AgentScope = "search" | "read";

export type AgentPrincipal = {
  user: CurrentUser;
  scopes: AgentScope[];
};

export type AgentAuthentication =
  | { ok: true; principal: AgentPrincipal }
  | { ok: false; reason: "unauthorized" | "insufficient_scope" };

export async function authenticateAgentToken(
  token: string,
  requiredScope: AgentScope,
): Promise<AgentAuthentication> {
  if (!token || token.length > 200) return { ok: false, reason: "unauthorized" };

  const record = await db.agentToken.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { organization: true } } },
  });
  const now = new Date();
  if (
    !record ||
    record.revokedAt ||
    record.expiresAt <= now ||
    !record.user.active ||
    (record.user.organizationId && !record.user.organization?.active)
  ) {
    return { ok: false, reason: "unauthorized" };
  }

  const scopes = record.scopes.split(",").filter(
    (scope): scope is AgentScope => scope === "search" || scope === "read",
  );
  if (!scopes.includes(requiredScope)) {
    return { ok: false, reason: "insufficient_scope" };
  }

  const useUpdate = await db.agentToken.updateMany({
    where: { id: record.id, revokedAt: null, expiresAt: { gt: now } },
    data: { lastUsedAt: now },
  });
  if (useUpdate.count !== 1) return { ok: false, reason: "unauthorized" };

  return {
    ok: true,
    principal: {
      user: {
        id: record.user.id,
        email: record.user.email,
        name: record.user.name,
        role: record.user.role as Role,
        organizationId: record.user.organizationId,
      },
      scopes,
    },
  };
}

export async function authenticateAgentRequest(
  request: Request,
  requiredScope: AgentScope,
): Promise<AgentAuthentication> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) return { ok: false, reason: "unauthorized" };
  return authenticateAgentToken(match[1], requiredScope);
}
