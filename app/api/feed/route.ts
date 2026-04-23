import { NextRequest, NextResponse } from "next/server";
import {
  FEED_PAGE_SIZE,
  MAX_FEED_PAGE_SIZE,
  getOlderFeedPage,
} from "@/features/feed/lib";

function parsePaginationParam(value: string | null, fallback: number) {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const offset = parsePaginationParam(searchParams.get("offset"), 0);
    const limit = parsePaginationParam(
      searchParams.get("limit"),
      FEED_PAGE_SIZE
    );

    if (
      offset === null ||
      limit === null ||
      offset < 0 ||
      limit < 1 ||
      limit > MAX_FEED_PAGE_SIZE
    ) {
      return new NextResponse("Invalid pagination parameters.", {
        status: 400,
      });
    }

    const feedPage = await getOlderFeedPage(offset, limit);
    return NextResponse.json(feedPage);
  } catch (error) {
    console.error("GET /api/feed failed:", error);
    return new NextResponse("Feed could not be loaded.", {
      status: 500,
    });
  }
}

