import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { loadProjectEnv } from "./load-env";

loadProjectEnv();
const [{ authenticateAgentToken }, { getAgentSourceBaseUrl, readAgentChunk, searchAgentChunks }, { db }] =
  await Promise.all([
    import("@/lib/agent-auth"),
    import("@/lib/agent-content"),
    import("@/lib/db"),
  ]);
const token = process.env.DOCS_AGENT_TOKEN?.trim();
if (!token) {
  throw new Error("Set DOCS_AGENT_TOKEN to an active agent token before starting the MCP server.");
}

const filtersSchema = {
  language: z.enum(["zh-CN", "en-US"]).optional(),
  product: z.string().max(100).optional(),
  apiVersion: z.string().max(50).optional(),
};

const searchOutputSchema = z.object({
  chunks: z.array(
    z.object({
      chunkId: z.string(),
      revision: z.number(),
      title: z.string(),
      contentType: z.string(),
      language: z.string(),
      product: z.string(),
      apiVersion: z.string(),
      tags: z.array(z.string()),
      allowedAgentScope: z.array(z.string()),
      lastVerified: z.string().nullable(),
      deprecationStatus: z.string(),
      sourceUrl: z.string().nullable(),
      snippet: z.string(),
    }),
  ),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

const readOutputSchema = z.object({
  chunk: z.object({
    chunkId: z.string(),
    revision: z.number(),
    title: z.string(),
    contentType: z.string(),
    language: z.string(),
    product: z.string(),
    apiVersion: z.string(),
    tags: z.array(z.string()),
    allowedAgentScope: z.array(z.string()),
    lastVerified: z.string().nullable(),
    deprecationStatus: z.string(),
    body: z.record(z.string(), z.unknown()),
    sourceUrl: z.string().nullable(),
  }),
});

const handle = serveStdio(() => {
  const server = new McpServer({ name: "docforge-agent", version: "1.0.0" });
  server.server.onclose = () => {
    void db.$disconnect().catch((error: unknown) => {
      console.error("Failed to close the MCP database connection.", error);
    });
  };
  server.registerTool(
    "search_docs",
    {
      title: "Search published documentation",
      description:
        "Search published documentation accessible to the token's account. Results include applicability, revision, deprecation and source metadata. Supply product, API version and language when querying restricted content.",
      inputSchema: z.object({
        query: z.string().trim().min(1).max(100),
        ...filtersSchema,
        page: z.number().int().min(1).max(1000).default(1),
      }),
      outputSchema: searchOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ query, language, product, apiVersion, page }) => {
      const authentication = await authenticateAgentToken(token, "search");
      if (!authentication.ok) throw new Error("Agent token is invalid, expired, or lacks search scope.");
      const result = await searchAgentChunks({
        q: query,
        page,
        filters: { language, product, apiVersion },
        principal: authentication.principal,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    },
  );
  server.registerTool(
    "read_doc_chunk",
    {
      title: "Read a published documentation chunk",
      description:
        "Read one published chunk by stable ID. The server verifies the token's user, organization and version applicability; unpublished or inaccessible content is not returned.",
      inputSchema: z.object({
        chunkId: z.string().min(1).max(200),
        ...filtersSchema,
      }),
      outputSchema: readOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ chunkId, language, product, apiVersion }) => {
      const authentication = await authenticateAgentToken(token, "read");
      if (!authentication.ok) throw new Error("Agent token is invalid, expired, or lacks read scope.");
      const chunk = await readAgentChunk({
        chunkId,
        filters: { language, product, apiVersion },
        principal: authentication.principal,
      });
      if (!chunk) throw new Error("Published chunk not found or not accessible.");
      return {
        content: [{ type: "text", text: JSON.stringify({ chunk }) }],
        structuredContent: { chunk },
      };
    },
  );
  return server;
});

process.on("SIGINT", () => {
  void handle.close();
});
process.on("SIGTERM", () => {
  void handle.close();
});

console.error(`DocForge MCP server ready. Source base: ${getAgentSourceBaseUrl()}`);
