import { NextResponse } from "next/server";
import { listPublicChunks } from "@/lib/content";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = url.searchParams.get("language") ?? undefined;
  const product = url.searchParams.get("product") ?? undefined;
  const apiVersion = url.searchParams.get("apiVersion") ?? undefined;
  if (
    (language && !["zh-CN", "en-US"].includes(language)) ||
    [product, apiVersion].some((value) => value && value.length > 100)
  ) {
    return NextResponse.json({ error: "INVALID_FILTER" }, { status: 400 });
  }

  return NextResponse.json({
    chunks: await listPublicChunks({ language, product, apiVersion }),
  });
}
