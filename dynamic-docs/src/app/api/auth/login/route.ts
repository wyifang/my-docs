import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashSessionToken, SESSION_COOKIE, SESSION_DURATION_MS, verifyPassword } from "@/lib/auth";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { clearLoginFailures, getLoginRetryAfter, recordLoginFailure } from "@/lib/login-throttle";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 400 });
  }

  const email = parsed.data.email;
  const retryAfter = await getLoginRetryAfter(email);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "TOO_MANY_LOGIN_ATTEMPTS" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const user = await db.user.findUnique({
    where: { email },
  });
  if (!user?.active || !verifyPassword(parsed.data.password, user.passwordHash)) {
    await recordLoginFailure(email);
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await clearLoginFailures(email);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
