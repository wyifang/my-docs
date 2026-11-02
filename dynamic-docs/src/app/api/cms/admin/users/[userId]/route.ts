import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { canDeactivateOrDemoteAdmin } from "@/lib/admin-management";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { adminUserUpdateSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ userId: string }> };

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
  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, {
      status: 400,
    });
  }

  const { userId } = await context.params;
  const result = await db.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { active: true } } },
    });
    if (!target) return { error: "NOT_FOUND" as const, status: 404 };
    if (parsed.data.organizationId) {
      const organization = await transaction.organization.findUnique({
        where: { id: parsed.data.organizationId },
      });
      if (!organization?.active) {
        return { error: "ORGANIZATION_NOT_FOUND_OR_INACTIVE" as const, status: 400 };
      }
    }

    const activeAdminCount = await transaction.user.count({
      where: {
        role: "ADMIN",
        active: true,
        OR: [
          { organizationId: null },
          { organization: { is: { active: true } } },
        ],
      },
    });
    if (!canDeactivateOrDemoteAdmin({
      activeAdminCount,
      targetIsActiveAdmin:
        target.role === "ADMIN" &&
        target.active &&
        (!target.organizationId || target.organization?.active === true),
      nextRole: parsed.data.role,
      nextActive: parsed.data.active,
    })) {
      return { error: "CANNOT_DISABLE_LAST_ACTIVE_ADMIN" as const, status: 409 };
    }

    const updatedUser = await transaction.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        organizationId: true,
        createdAt: true,
      },
    });
    if (!parsed.data.active) {
      await transaction.session.deleteMany({ where: { userId } });
      await transaction.agentToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await transaction.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "USER_UPDATED",
        targetType: "USER",
        targetId: userId,
        detailsJson: JSON.stringify({
          role: parsed.data.role,
          active: parsed.data.active,
          organizationId: parsed.data.organizationId,
        }),
      },
    });
    return { user: updatedUser };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
