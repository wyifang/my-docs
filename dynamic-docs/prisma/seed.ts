import { loadProjectEnv } from "../scripts/load-env";
import { hashPassword } from "../src/lib/auth";

const accounts = [
  { role: "ADMIN", prefix: "ADMIN", defaultEmail: "admin@example.test", defaultName: "文档管理员" },
  { role: "AUTHOR", prefix: "AUTHOR", defaultEmail: "author@example.test", defaultName: "内容作者" },
  { role: "REVIEWER", prefix: "REVIEWER", defaultEmail: "reviewer@example.test", defaultName: "内容审核员" },
  { role: "PUBLISHER", prefix: "PUBLISHER", defaultEmail: "publisher@example.test", defaultName: "发布管理员" },
  { role: "VIEWER", prefix: "VIEWER", defaultEmail: "customer@example.test", defaultName: "示例企业客户" },
] as const;

async function main() {
  loadProjectEnv();
  const { db } = await import("../src/lib/db");
  try {
    const users = new Map<string, string>();
    const organization = await db.organization.upsert({
      where: { id: "sample-customer" },
      create: { id: "sample-customer", name: "示例企业客户" },
      update: { name: "示例企业客户", active: true },
    });
    for (const account of accounts) {
      const email = (process.env[`${account.prefix}_EMAIL`] ?? account.defaultEmail).toLowerCase();
      const password = process.env[`${account.prefix}_PASSWORD`];
      if (!password || password.length < 12) {
        throw new Error(`${account.prefix}_PASSWORD must be set and contain at least 12 characters.`);
      }

      const user = await db.user.upsert({
        where: { email },
        create: {
          email,
          name: account.defaultName,
          role: account.role,
          passwordHash: hashPassword(password),
          organizationId: account.role === "VIEWER" ? organization.id : null,
        },
        update: {
          name: account.defaultName,
          role: account.role,
          passwordHash: hashPassword(password),
          active: true,
          organizationId: account.role === "VIEWER" ? organization.id : null,
        },
      });
      users.set(account.role, user.id);
    }

    const exampleChunkId = "sample-maas-chat-completions";
    const existingExample = await db.chunk.findUnique({ where: { id: exampleChunkId } });
    if (!existingExample) {
      const authorId = users.get("AUTHOR");
      if (!authorId) throw new Error("Missing seeded author.");
      await db.chunk.create({
        data: {
          id: exampleChunkId,
          createdBy: authorId,
          revisions: {
            create: {
            revision: 1,
            createdBy: authorId,
            title: "创建模型对话补全",
            contentType: "api_operation",
            language: "zh-CN",
            product: "MaaS",
            apiVersion: "v1",
            accessPolicy: "PUBLIC",
            allowedAgentScope: "search,read,cite",
            deprecationStatus: "active",
            bodyJson: JSON.stringify({
              method: "POST",
              path: "/v1/chat/completions",
              summary: "向 MaaS 对话补全 API 发送一组消息并获取模型生成结果。",
              authentication: "Bearer token",
              request: {
                model: "example-model",
                messages: [{ role: "user", content: "你好" }],
              },
              response: {
                id: "chatcmpl_example",
                choices: [{ message: { role: "assistant", content: "你好！" } }],
              },
            }),
            },
          },
        },
      });
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
