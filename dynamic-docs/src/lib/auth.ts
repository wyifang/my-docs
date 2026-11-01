import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "dynamic_docs_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export type Role = "ADMIN" | "AUTHOR" | "REVIEWER" | "PUBLISHER" | "VIEWER";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, expectedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { organization: true } } },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.user.active ||
    (session.user.organizationId && !session.user.organization?.active)
  ) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };
}

export function hasRole(user: CurrentUser | null, ...roles: Role[]): user is CurrentUser {
  return user !== null && roles.includes(user.role);
}
