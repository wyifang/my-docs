import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { adminOrganizationUpdateSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const actor = await getCurrentUser();
  if (!hasRole(actor, "ADMIN")) {
    return NextResponse.json({ error: actor ? "FORBIDDEN" : "UNAUTHENTICATED" }, {
      status: actor ? 403 : 401,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  const parsed = adminOrganizationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, {
      status: 400,
    });
  }

  const { organizationId } = await context.params;
  const result = await db.$transaction(async (transaction) => {
    const current = await transaction.organization.findUnique({
      where: { id: organizationId },
    });
    if (!current) return { error: "NOT_FOUND" as const, status: 404 };
    if (!parsed.data.active) {
      const activeAdmins = await transaction.user.count({
        where: { organizationId, role: "ADMIN", active: true },
      });
      if (activeAdmins > 0) {
        return { error: "CANNOT_DISABLE_ORGANIZATION_WITH_ACTIVE_ADMIN" as const, status: 409 };
      }
    }

    const updated = await transaction.organization.update({
      where: { id: organizationId },
      data: parsed.data,
    });
    if (!parsed.data.active) {
      const users = await transaction.user.findMany({
        where: { organizationId },
        select: { id: true },
      });
      const userIds = users.map(({ id }) => id);
      await transaction.session.deleteMany({ where: { userId: { in: userIds } } });
      await transaction.agentToken.updateMany({
        where: { userId: { in: userIds }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await transaction.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "ORGANIZATION_UPDATED",
        targetType: "ORGANIZATION",
        targetId: organizationId,
        detailsJson: JSON.stringify({ name: parsed.data.name, active: parsed.data.active }),
      },
    });
    return { organization: updated };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
