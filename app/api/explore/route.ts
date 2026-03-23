import { NextRequest, NextResponse } from "next/server";
import { EXPLORE_PAGE_SIZE, getTrendingFeedPage } from "@/lib/explore-feed";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") ?? 0);
    const limit = Number(searchParams.get("limit") ?? EXPLORE_PAGE_SIZE);

    const posts = await getTrendingFeedPage(offset, limit);
    return NextResponse.json(posts);
  } catch (error) {
    console.error(error);
    return new NextResponse("Explore konnte nicht geladen werden.", {
      status: 500,
    });
  }
}