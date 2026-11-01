import type { AgentPrincipal } from "@/lib/agent-auth";
import { getPublishedChunkForAgent, searchPublishedChunks } from "@/lib/content";

type Filters = {
  language?: string;
  product?: string;
  apiVersion?: string;
};

function sourceUrl(chunkId: string, filters: Filters) {
  const baseUrl = process.env.DOCS_BASE_URL ?? "http://localhost:3000";
  const url = new URL(`/docs/${encodeURIComponent(chunkId)}`, baseUrl);
  if (filters.language) url.searchParams.set("language", filters.language);
  if (filters.product) url.searchParams.set("product", filters.product);
  if (filters.apiVersion) url.searchParams.set("apiVersion", filters.apiVersion);
  return url.toString();
}

function toAgentChunk(
  revision: Awaited<ReturnType<typeof getPublishedChunkForAgent>> & {},
  filters: Filters,
) {
  return {
    chunkId: revision.chunkId,
    revision: revision.revision,
    title: revision.title,
    contentType: revision.contentType,
    language: revision.language,
    product: revision.product,
    apiVersion: revision.apiVersion,
    tags: revision.tags,
    allowedAgentScope: revision.allowedAgentScope,
    lastVerified: revision.lastVerified,
    deprecationStatus: revision.deprecationStatus,
    body: revision.body,
    sourceUrl: revision.allowedAgentScope.includes("cite")
      ? sourceUrl(revision.chunkId, filters)
      : null,
  };
}

export async function searchAgentChunks(input: {
  q: string;
  page: number;
  filters: Filters;
  principal: AgentPrincipal;
}) {
  const result = await searchPublishedChunks({
    q: input.q,
    ...input.filters,
    page: input.page,
    user: input.principal.user,
    requiredAgentScope: "search",
  });
  return {
    ...result,
    chunks: result.chunks.map((revision) => {
      const { body, ...metadata } = toAgentChunk(revision, input.filters);
      const summary =
        typeof body.summary === "string" ? body.summary : JSON.stringify(body);
      return {
        ...metadata,
        snippet: summary.length > 280 ? `${summary.slice(0, 277)}...` : summary,
      };
    }),
  };
}

export async function readAgentChunk(input: {
  chunkId: string;
  filters: Filters;
  principal: AgentPrincipal;
}) {
  const revision = await getPublishedChunkForAgent({
    chunkId: input.chunkId,
    ...input.filters,
    user: input.principal.user,
    requiredAgentScope: "read",
  });
  return revision ? toAgentChunk(revision, input.filters) : null;
}

export function getAgentSourceBaseUrl() {
  return process.env.DOCS_BASE_URL ?? "http://localhost:3000";
}
