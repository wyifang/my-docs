import { NextResponse } from "next/server";
import { authenticateAgentRequest } from "@/lib/agent-auth";
import { readAgentChunk } from "@/lib/agent-content";

type RouteContext = { params: Promise<{ chunkId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authentication = await authenticateAgentRequest(request, "read");
  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.reason === "unauthorized" ? "UNAUTHORIZED" : "INSUFFICIENT_SCOPE" },
      { status: authentication.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const { chunkId } = await context.params;
  const url = new URL(request.url);
  const filters = {
    product: url.searchParams.get("product") ?? undefined,
    apiVersion: url.searchParams.get("apiVersion") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
  };
  if (
    (filters.language && !["zh-CN", "en-US"].includes(filters.language)) ||
    (filters.product && filters.product.length > 100) ||
    (filters.apiVersion && filters.apiVersion.length > 50)
  ) {
    return NextResponse.json({ error: "INVALID_FILTER" }, { status: 400 });
  }

  const chunk = await readAgentChunk({
    chunkId,
    filters,
    principal: authentication.principal,
  });
  if (!chunk) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ chunk });
}
