import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchPublishedChunks } from "@/lib/content";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const language = url.searchParams.get("language") ?? undefined;
  const product = url.searchParams.get("product") ?? undefined;
  const apiVersion = url.searchParams.get("apiVersion") ?? undefined;
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  if (
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

  const user = await getCurrentUser();
  const result = await searchPublishedChunks({ q, language, product, apiVersion, page, user });
  return NextResponse.json(result);
}
