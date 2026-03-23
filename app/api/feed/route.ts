import { NextRequest, NextResponse } from "next/server";
import { getFeedPage, FEED_PAGE_SIZE } from "@/lib/feed";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const offsetParam = searchParams.get("offset");
    const limitParam = searchParams.get("limit");

    const offset = Number(offsetParam ?? 0);
    const limit = Number(limitParam ?? FEED_PAGE_SIZE);

    if (!Number.isFinite(offset) || !Number.isFinite(limit)) {
      return new NextResponse("Ungültige Pagination-Parameter.", {
        status: 400,
      });
    }

    const posts = await getFeedPage(offset, limit);
    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET /api/feed failed:", error);
    return new NextResponse("Feed konnte nicht geladen werden.", {
      status: 500,
    });
  }
}