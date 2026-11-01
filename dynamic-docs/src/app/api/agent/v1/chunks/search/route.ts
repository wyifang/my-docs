import { NextResponse } from "next/server";
import { authenticateAgentRequest } from "@/lib/agent-auth";
import { searchAgentChunks } from "@/lib/agent-content";

export async function GET(request: Request) {
  const authentication = await authenticateAgentRequest(request, "search");
  if (!authentication.ok) {
    return NextResponse.json(
      { error: authentication.reason === "unauthorized" ? "UNAUTHORIZED" : "INSUFFICIENT_SCOPE" },
      { status: authentication.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const language = url.searchParams.get("language") ?? undefined;
  const product = url.searchParams.get("product") ?? undefined;
  const apiVersion = url.searchParams.get("apiVersion") ?? undefined;
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  if (
    !q ||
    q.length > 100 ||
    (language && !["zh-CN", "en-US"].includes(language)) ||
    (product && product.length > 100) ||
    (apiVersion && apiVersion.length > 50) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000
  ) {
    return NextResponse.json({ error: "INVALID_SEARCH_FILTER" }, { status: 400 });
  }

  const result = await searchAgentChunks({
    q,
    page,
    filters: { language, product, apiVersion },
    principal: authentication.principal,
  });
  return NextResponse.json(result);
}
