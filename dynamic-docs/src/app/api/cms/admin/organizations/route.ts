import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { adminOrganizationCreateSchema } from "@/lib/schemas";

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
  const parsed = adminOrganizationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, {
      status: 400,
    });
  }
  if (await db.organization.findUnique({ where: { id: parsed.data.id } })) {
    return NextResponse.json({ error: "ORGANIZATION_ID_ALREADY_EXISTS" }, { status: 409 });
  }

  const organization = await db.$transaction(async (transaction) => {
    const created = await transaction.organization.create({ data: parsed.data });
    await transaction.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "ORGANIZATION_CREATED",
        targetType: "ORGANIZATION",
        targetId: created.id,
        detailsJson: JSON.stringify({ name: created.name }),
      },
    });
    return created;
  });
  return NextResponse.json({ organization }, { status: 201 });
}
