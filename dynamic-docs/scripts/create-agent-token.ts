import { createHash, randomBytes } from "node:crypto";
import { loadProjectEnv } from "./load-env";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  loadProjectEnv();
  const email = option("--email")?.toLowerCase();
  const name = option("--name");
  const expiresInDays = Number(option("--expires-days") ?? "90");
  if (
    !email ||
    !name ||
    name.length > 100 ||
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 365
  ) {
    throw new Error(
      'Usage: npm run agent-token:create -- --email viewer@example.test --name "Local MCP" [--expires-days 90]',
    );
  }

  const { db } = await import("@/lib/db");
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new Error(`No active user account found for ${email}.`);
    }

    const secret = `ddocs_${randomBytes(32).toString("base64url")}`;
    const token = await db.agentToken.create({
      data: {
        name,
        userId: user.id,
        tokenHash: createHash("sha256").update(secret).digest("hex"),
        scopes: "search,read",
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`Agent token ID: ${token.id}`);
    console.log(`Agent token (shown once): ${secret}`);
    console.log(`Identity: ${user.email} (${user.role})`);
    console.log(`Expires: ${token.expiresAt.toISOString()}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
