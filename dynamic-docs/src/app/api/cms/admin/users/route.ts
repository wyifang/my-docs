import { NextResponse } from "next/server";
import { getCurrentUser, hasRole, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { adminUserCreateSchema } from "@/lib/schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN")) {
    return NextResponse.json({ error: user ? "FORBIDDEN" : "UNAUTHENTICATED" }, {
      status: user ? 403 : 401,
    });
  }

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
      select: { id: true, name: true, active: true },
    }),
  ]);
  return NextResponse.json({ users, organizations });
}

export async function POST(request: Request) {
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
  const parsed = adminUserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, {
      status: 400,
    });
  }

  const { email, name, password, role, organizationId } = parsed.data;
  if (organizationId) {
    const organization = await db.organization.findUnique({ where: { id: organizationId } });
    if (!organization?.active) {
      return NextResponse.json({ error: "ORGANIZATION_NOT_FOUND_OR_INACTIVE" }, { status: 400 });
    }
  }
  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
  }

  const created = await db.$transaction(async (transaction) => {
    const newUser = await transaction.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        role,
        organizationId,
      },
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
    await transaction.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "USER_CREATED",
        targetType: "USER",
        targetId: newUser.id,
        detailsJson: JSON.stringify({ email, role, organizationId }),
      },
    });
    return newUser;
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
