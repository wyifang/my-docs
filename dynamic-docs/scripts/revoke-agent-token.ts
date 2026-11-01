import { loadProjectEnv } from "./load-env";

async function main() {
  loadProjectEnv();
  const { db } = await import("@/lib/db");
  const id = process.argv[2];
  if (!id) throw new Error("Usage: npm run agent-token:revoke -- <agent-token-id>");

  try {
    const result = await db.agentToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new Error(`No active agent token found for ID ${id}.`);
    console.log(`Revoked agent token ${id}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
