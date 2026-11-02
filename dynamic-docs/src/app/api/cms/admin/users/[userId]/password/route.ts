import { NextResponse } from "next/server";
import { getCurrentUser, hasRole, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { adminPasswordResetSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, context: RouteContext) {
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
  const parsed = adminPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, {
      status: 400,
    });
  }

  const { userId } = await context.params;
  if (userId === actor.id) {
    return NextResponse.json({ error: "SELF_PASSWORD_RESET_NOT_ALLOWED" }, { status: 409 });
  }
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const passwordHash = hashPassword(parsed.data.password);
  await db.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await transaction.session.deleteMany({ where: { userId } });
    await transaction.agentToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "USER_PASSWORD_RESET",
        targetType: "USER",
        targetId: userId,
        detailsJson: JSON.stringify({ sessionsRevoked: true, agentTokensRevoked: true }),
      },
    });
  });

  return NextResponse.json({ success: true });
}
