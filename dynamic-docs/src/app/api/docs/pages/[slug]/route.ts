import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedPage } from "@/lib/pages";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
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
  ) return NextResponse.json({ error: "INVALID_FILTER" }, { status: 400 });
  const { slug } = await context.params;
  const page = await getPublishedPage(slug, await getCurrentUser(), filters);
  if (!page) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ page });
}
